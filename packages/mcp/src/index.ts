import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import WebSocket, { type RawData } from 'ws';
import {
  encodeOutputFrame,
  encodeEndFrame,
  encodeResizeFrame,
  encodePong,
  decodeFrame,
  decodeViewerCount,
  FrameType,
  CHUNK_DEBOUNCE_MS,
  WS_CLOSE,
  DEFAULT_RATE_LIMITS,
  type CreateSessionResponse,
  type ApiResponse,
} from '@shout/shared';

// ── Configuration ──────────────────────────────────────────

const API_KEY = process.env.SHOUT_API_KEY;
const API_URL = (process.env.SHOUT_API_URL ?? 'https://api.shout.run').replace(/\/$/, '');

// ── Session State ──────────────────────────────────────────

interface ActiveSession {
  sessionId: string;
  url: string;
  wsUrl: string;
  ws: WebSocket;
  startTime: number;
  viewerCount: number;
  buffer: string;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  bytesThisSecond: number;
  lastSecondReset: number;
}

let activeSession: ActiveSession | null = null;

// ── Helpers ────────────────────────────────────────────────

const MAX_CHUNK_BYTES = 64 * 1024;

function sendChunk(session: ActiveSession, data: string): void {
  const timestampMs = Date.now() - session.startTime;
  const frame = encodeOutputFrame(data, timestampMs);
  if (session.ws.readyState === WebSocket.OPEN) {
    session.ws.send(frame);
  }
}

function flushBuffer(session: ActiveSession): void {
  if (session.buffer.length === 0) return;

  const now = Date.now();
  if (now - session.lastSecondReset >= 1000) {
    session.bytesThisSecond = 0;
    session.lastSecondReset = now;
  }

  const raw = session.buffer;
  session.buffer = '';

  const totalBytes = Buffer.byteLength(raw, 'utf-8');

  if (session.bytesThisSecond + totalBytes > DEFAULT_RATE_LIMITS.maxBytesPerSecond) {
    const remaining = 1000 - (now - session.lastSecondReset);
    session.buffer = raw + session.buffer;
    setTimeout(() => flushBuffer(session), remaining > 0 ? remaining : 1000);
    return;
  }

  session.bytesThisSecond += totalBytes;

  if (totalBytes <= MAX_CHUNK_BYTES) {
    sendChunk(session, raw);
  } else {
    let offset = 0;
    while (offset < raw.length) {
      let end = offset + MAX_CHUNK_BYTES;
      if (end > raw.length) end = raw.length;
      while (end > offset && raw.charCodeAt(end - 1) >= 0xd800 && raw.charCodeAt(end - 1) <= 0xdbff) {
        end--;
      }
      sendChunk(session, raw.slice(offset, end));
      offset = end;
    }
  }
}

async function createAndConnectSession(title: string, visibility: string): Promise<ActiveSession> {
  // Create session via API
  const response = await fetch(`${API_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, visibility }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error.error ?? `Failed to create session: ${response.status}`);
  }

  const result = (await response.json()) as ApiResponse<CreateSessionResponse>;
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? 'Failed to create session');
  }

  const { sessionId, wsUrl } = result.data;

  // Derive viewer URL
  const webBase = API_URL.replace('api.', '');

  // Connect WebSocket
  const wsUrlWithAuth = `${wsUrl}?token=${encodeURIComponent(API_KEY!)}`;
  const ws = new WebSocket(wsUrlWithAuth);
  ws.binaryType = 'arraybuffer';

  const session: ActiveSession = {
    sessionId,
    url: `${webBase}/${sessionId}`,
    wsUrl,
    ws,
    startTime: Date.now(),
    viewerCount: 0,
    buffer: '',
    debounceTimer: null,
    bytesThisSecond: 0,
    lastSecondReset: Date.now(),
  };

  // Handle incoming messages
  ws.on('message', (data: RawData) => {
    try {
      let bytes: Uint8Array;
      if (data instanceof ArrayBuffer) {
        bytes = new Uint8Array(data);
      } else if (Buffer.isBuffer(data)) {
        bytes = new Uint8Array(data);
      } else if (Array.isArray(data)) {
        bytes = new Uint8Array(Buffer.concat(data));
      } else {
        return; // Unknown type
      }
      const frame = decodeFrame(bytes);
      if (frame.type === FrameType.Ping) {
        ws.send(encodePong());
      } else if (frame.type === FrameType.ViewerCount) {
        session.viewerCount = decodeViewerCount(frame.payload);
      }
    } catch {
      // Ignore decode errors
    }
  });

  // Wait for connection
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
    ws.on('open', () => {
      clearTimeout(timeout);
      // Send initial terminal size
      ws.send(encodeResizeFrame(120, 40));
      resolve();
    });
    ws.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  return session;
}

async function endActiveSession(): Promise<string | null> {
  if (!activeSession) return null;

  const session = activeSession;
  const url = session.url;
  activeSession = null;

  // Flush buffer
  if (session.debounceTimer) clearTimeout(session.debounceTimer);
  flushBuffer(session);

  // Send end frame
  try {
    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(encodeEndFrame());
    }
  } catch {
    // WebSocket may already be closed
  }

  // End via API
  try {
    await fetch(`${API_URL}/api/sessions/${session.sessionId}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
  } catch {
    // Best effort
  }

  // Close WebSocket
  try {
    session.ws.close(WS_CLOSE.NORMAL, 'Session ended');
  } catch {
    // Ignore close errors
  }

  return url;
}

// ── MCP Server ─────────────────────────────────────────────

const server = new McpServer({
  name: 'shout',
  version: '0.1.0',
});

server.tool(
  'shout_start_broadcast',
  'Start broadcasting your terminal to shout.run. Viewers can watch live at the returned URL.',
  {
    title: z.string().optional().describe('Session title shown to viewers'),
    visibility: z
      .enum(['public', 'private'])
      .optional()
      .default('public')
      .describe('Who can see the session'),
  },
  async ({ title, visibility }) => {
    if (!API_KEY) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: SHOUT_API_KEY environment variable is not set. Get an API key at shout.run.',
          },
        ],
        isError: true,
      };
    }

    if (activeSession) {
      return {
        content: [
          {
            type: 'text',
            text: `A broadcast is already active (${activeSession.url}). End it first with shout_end_broadcast.`,
          },
        ],
        isError: true,
      };
    }

    try {
      activeSession = await createAndConnectSession(title ?? 'Agent Session', visibility ?? 'public');

      return {
        content: [
          {
            type: 'text',
            text: `Broadcasting live!\n\nSession: ${activeSession.sessionId}\nWatch at: ${activeSession.url}\n\nUse shout_write to send terminal output, shout_end_broadcast when done.`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{ type: 'text', text: `Failed to start broadcast: ${message}` }],
        isError: true,
      };
    }
  }
);

server.tool(
  'shout_write',
  'Write terminal output to the active broadcast. Viewers see this in real-time.',
  {
    data: z
      .string()
      .describe('Terminal text to broadcast (supports ANSI escape codes, use \\r\\n for newlines)'),
  },
  async ({ data }) => {
    if (!activeSession) {
      return {
        content: [
          { type: 'text', text: 'No active broadcast. Start one with shout_start_broadcast first.' },
        ],
        isError: true,
      };
    }

    activeSession.buffer += data;
    if (activeSession.debounceTimer) clearTimeout(activeSession.debounceTimer);
    activeSession.debounceTimer = setTimeout(() => {
      if (activeSession) flushBuffer(activeSession);
    }, CHUNK_DEBOUNCE_MS);

    return {
      content: [{ type: 'text', text: `Sent ${data.length} chars to broadcast.` }],
    };
  }
);

server.tool('shout_end_broadcast', 'End the active broadcast session.', {}, async () => {
  const url = await endActiveSession();
  if (!url) {
    return {
      content: [{ type: 'text', text: 'No active broadcast to end.' }],
    };
  }
  return {
    content: [{ type: 'text', text: `Broadcast ended.\nReplay available at: ${url}` }],
  };
});

server.tool('shout_broadcast_status', 'Check the status of the current broadcast.', {}, async () => {
  if (!activeSession) {
    return {
      content: [{ type: 'text', text: 'No active broadcast.' }],
    };
  }

  const duration = Math.floor((Date.now() - activeSession.startTime) / 1000);
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;

  return {
    content: [
      {
        type: 'text',
        text: `Active broadcast:\n  Session: ${activeSession.sessionId}\n  URL: ${activeSession.url}\n  Viewers: ${activeSession.viewerCount}\n  Duration: ${mins}m ${secs}s\n  WebSocket: ${activeSession.ws.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'}`,
      },
    ],
  };
});

// ── Start ──────────────────────────────────────────────────

// Clean up on exit
process.on('SIGINT', async () => {
  await endActiveSession();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await endActiveSession();
  process.exit(0);
});

const transport = new StdioServerTransport();
await server.connect(transport);
