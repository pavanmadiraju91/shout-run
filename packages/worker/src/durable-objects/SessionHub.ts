import type { Env } from '../env.js';
import {
  decodeFrame,
  decodeResize,
  encodeEndFrame,
  encodeOutputFrame,
  encodeResizeFrame,
  encodeSnapshotFrame,
  encodeViewerCountFrame,
  encodeMetaFrame,
  encodePing,
  FrameType,
  WS_CLOSE,
  DEFAULT_RATE_LIMITS,
  PING_INTERVAL_MS,
} from '@shout/shared';
import { createDb, sessions } from '../lib/db.js';
import { eq } from 'drizzle-orm';

import { VtParser } from '../lib/vt-wasm/vt_wasm.js';

/** Maximum bytes to accumulate in allChunks for replay (50 MB). */
const MAX_REPLAY_BYTES = 50 * 1024 * 1024;

interface SessionState {
  sessionId: string;
  userId: string;
  username: string;
  title: string;
  description?: string;
  visibility?: 'public' | 'followers' | 'private';
  startedAt: number;
}

export class SessionHub implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  // Session metadata
  private sessionState: SessionState | null = null;

  // WebSocket connections
  private broadcaster: WebSocket | null = null;
  private viewers: Set<WebSocket> = new Set();

  // Last Resize frame for late-joining viewers (so xterm.js gets correct dimensions)
  private lastResizeFrame: Uint8Array | null = null;

  // Virtual terminal parser for generating screen snapshots for late joiners
  private vtParser: VtParser | null = null;

  private allChunks: Uint8Array[] = [];
  private allChunksBytes = 0;
  private replayCapReached = false;

  // Tracks how many chunks from allChunks have already been flushed to DO storage.
  // After hibernation wake, allChunks is empty but storage has the persisted data.
  private flushedChunkCount = 0;

  // Rate limiting
  private bytesThisSecond = 0;
  private lastRateLimitReset = 0;

  // Heartbeat: tracks last message from broadcaster for dead-connection detection
  private lastBroadcasterActivity = 0;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Restore any WebSocket connections that survived hibernation
    this.state.getWebSockets('broadcaster').forEach((ws) => {
      this.broadcaster = ws;
      // After hibernation, treat wake-up as proof of life so the alarm
      // doesn't immediately kill the session (lastBroadcasterActivity was 0).
      this.lastBroadcasterActivity = Date.now();
    });
    this.state.getWebSockets('viewer').forEach((ws) => {
      this.viewers.add(ws);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Initialize session
    if (path === '/init' && request.method === 'POST') {
      const body = (await request.json()) as SessionState;
      this.sessionState = {
        ...body,
        startedAt: Date.now(),
      };
      await this.state.storage.put('sessionState', this.sessionState);

      // Alarm chain starts when broadcaster connects in handleBroadcasterUpgrade()
      return new Response('OK', { status: 200 });
    }

    // Explicit end from API (CLI shutdown fallback)
    if (path === '/end' && request.method === 'POST') {
      await this.persistReplayToStorage();
      return new Response('OK', { status: 200 });
    }

    // Replay data for ended sessions
    if (path === '/replay' && request.method === 'GET') {
      return await this.handleReplay();
    }

    // Asciicast v2 export
    if (path === '/export' && request.method === 'GET') {
      return await this.handleExport();
    }

    // Handle WebSocket upgrades
    if (path === '/broadcaster') {
      return this.handleBroadcasterUpgrade(request);
    }

    if (path === '/viewer') {
      return this.handleViewerUpgrade(request);
    }

    return new Response('Not Found', { status: 404 });
  }

  private async handleBroadcasterUpgrade(request: Request): Promise<Response> {
    // Only one broadcaster allowed
    if (this.broadcaster) {
      return new Response('Broadcaster already connected', { status: 409 });
    }

    // Load session state if not in memory
    if (!this.sessionState) {
      const stored = await this.state.storage.get<SessionState>('sessionState');
      if (!stored) {
        return new Response('Session not initialized', { status: 400 });
      }
      this.sessionState = stored;
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server, ['broadcaster']);
    this.broadcaster = server;
    this.lastBroadcasterActivity = Date.now();

    // Start heartbeat alarm chain (also covers max duration)
    await this.state.storage.setAlarm(Date.now() + PING_INTERVAL_MS);

    return new Response(null, { status: 101, webSocket: client });
  }

  private async handleViewerUpgrade(request: Request): Promise<Response> {
    // Load session state if not in memory
    if (!this.sessionState) {
      const stored = await this.state.storage.get<SessionState>('sessionState');
      if (!stored) {
        return new Response('Session not found', { status: 404 });
      }
      this.sessionState = stored;
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.state.acceptWebSocket(server, ['viewer']);
    this.viewers.add(server);

    // Send metadata to the new viewer
    const metaFrame = encodeMetaFrame({
      sessionId: this.sessionState.sessionId,
      username: this.sessionState.username,
      title: this.sessionState.title,
      startedAt: this.sessionState.startedAt,
    });
    server.send(metaFrame);

    // Send last known Resize frame so xterm.js gets the right terminal dimensions
    if (this.lastResizeFrame) {
      server.send(this.lastResizeFrame);
    }

    // Send terminal state snapshot for late joiners
    if (this.vtParser) {
      try {
        const snapshot: Uint8Array = this.vtParser.state_formatted();
        if (snapshot.length > 0) {
          server.send(encodeSnapshotFrame(snapshot));
        }
      } catch (err) {
        console.error('Error generating snapshot:', err);
      }
    }

    // Update and broadcast viewer count
    this.broadcastViewerCount();

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    // Only broadcaster sends messages
    if (ws !== this.broadcaster) {
      return;
    }

    // Any message from broadcaster = proof of life
    this.lastBroadcasterActivity = Date.now();

    // Rate limiting
    const now = Date.now();
    if (now - this.lastRateLimitReset > 1000) {
      this.bytesThisSecond = 0;
      this.lastRateLimitReset = now;
    }

    const data = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    this.bytesThisSecond += data.byteLength;

    if (this.bytesThisSecond > DEFAULT_RATE_LIMITS.maxBytesPerSecond) {
      // Rate limited - drop the frame (could also close connection)
      return;
    }

    const bytes = new Uint8Array(data);

    try {
      const frame = decodeFrame(bytes);

      // Handle ping/pong
      if (frame.type === FrameType.Ping) {
        // Respond with pong - but broadcaster shouldn't need this
        return;
      }

      // Store in buffer for late joiners
      if (
        frame.type === FrameType.Output ||
        frame.type === FrameType.Resize ||
        frame.type === FrameType.Meta
      ) {
        // Track latest Resize frame for late-joining viewers
        if (frame.type === FrameType.Resize) {
          this.lastResizeFrame = bytes.slice();

          // Create or resize the virtual terminal parser
          const { cols, rows } = decodeResize(frame.payload);
          if (this.vtParser) {
            this.vtParser.resize(rows, cols);
          } else {
            this.vtParser = new VtParser(rows, cols);
          }
        }

        // Feed terminal output to the virtual terminal parser
        if (frame.type === FrameType.Output && this.vtParser) {
          this.vtParser.process(frame.payload);
        }

        // Store all chunks for persistence (up to memory cap) — skip for private sessions
        if (!this.replayCapReached && this.sessionState?.visibility !== 'private') {
          if (this.allChunksBytes + bytes.byteLength > MAX_REPLAY_BYTES) {
            this.replayCapReached = true;
          } else {
            this.allChunks.push(bytes);
            this.allChunksBytes += bytes.byteLength;
          }
        }
      }

      // Fan out to all viewers
      for (const viewer of this.viewers) {
        try {
          viewer.send(bytes);
        } catch {
          // Viewer disconnected, will be cleaned up in webSocketClose
        }
      }
    } catch (err) {
      console.error('Error processing frame:', err);
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    if (ws === this.broadcaster) {
      await this.handleBroadcasterClose();
    } else {
      this.viewers.delete(ws);
      this.broadcastViewerCount();
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    if (ws === this.broadcaster) {
      await this.handleBroadcasterClose();
    } else {
      this.viewers.delete(ws);
      this.broadcastViewerCount();
    }
  }

  private async handleBroadcasterClose(): Promise<void> {
    this.broadcaster = null;
    this.vtParser = null;

    // Send end frame to all viewers
    const endFrame = encodeEndFrame();
    for (const viewer of this.viewers) {
      try {
        viewer.send(endFrame);
        viewer.close(WS_CLOSE.SESSION_ENDED, 'Session ended');
      } catch {
        // Ignore errors closing viewers
      }
    }
    this.viewers.clear();

    // Persist replay data to DO storage (survives eviction)
    await this.persistReplayToStorage();

    // Persist session to R2 (if enabled)
    await this.persistSession();

    // Update session status in database
    if (this.sessionState) {
      try {
        const db = createDb(this.env.TURSO_URL, this.env.TURSO_AUTH_TOKEN);
        await db
          .update(sessions)
          .set({
            status: 'ended',
            endedAt: new Date().toISOString(),
          })
          .where(eq(sessions.id, this.sessionState.sessionId));
      } catch (err) {
        console.error('Error updating session status:', err);
      }
    }
  }

  private broadcastViewerCount(): void {
    const count = this.viewers.size;
    const frame = encodeViewerCountFrame(count);

    // Send to broadcaster if connected
    if (this.broadcaster) {
      try {
        this.broadcaster.send(frame);
      } catch {
        // Broadcaster disconnected
      }
    }

    // Send to all viewers
    for (const viewer of this.viewers) {
      try {
        viewer.send(frame);
      } catch {
        // Viewer disconnected
      }
    }

    // Update viewer count in database
    this.updateViewerCountInDb(count);
  }

  private async updateViewerCountInDb(count: number): Promise<void> {
    if (!this.sessionState) return;

    try {
      const db = createDb(this.env.TURSO_URL, this.env.TURSO_AUTH_TOKEN);
      await db
        .update(sessions)
        .set({ viewerCount: count })
        .where(eq(sessions.id, this.sessionState.sessionId));
    } catch (err) {
      console.error('Error updating viewer count:', err);
    }
  }

  private async persistSession(): Promise<void> {
    if (this.sessionState?.visibility === 'private') return;
    if (!this.sessionState || this.allChunks.length === 0) return;
    if (!this.env.SESSIONS_BUCKET) return; // R2 not enabled

    try {
      // Convert binary frames to JSON chunks (same format as DO storage replayChunks)
      const chunks: Array<{ type: string; data: string; timestamp: number; cols?: number; rows?: number }> = [];
      for (const raw of this.allChunks) {
        try {
          const frame = decodeFrame(raw);
          if (frame.type === FrameType.Output) {
            const text = new TextDecoder().decode(frame.payload);
            chunks.push({ type: 'output', data: text, timestamp: frame.timestamp });
          } else if (frame.type === FrameType.Resize) {
            const view = new DataView(
              frame.payload.buffer,
              frame.payload.byteOffset,
              frame.payload.byteLength,
            );
            chunks.push({
              type: 'resize',
              data: '',
              timestamp: frame.timestamp,
              cols: view.getUint16(0),
              rows: view.getUint16(2),
            });
          }
        } catch {
          // Skip corrupt frames
        }
      }

      if (chunks.length === 0) return;

      // Store replay data as JSON (readable by handleReplay without binary parsing)
      await this.env.SESSIONS_BUCKET.put(
        `sessions/${this.sessionState.sessionId}.json`,
        JSON.stringify({ chunks }),
        {
          httpMetadata: { contentType: 'application/json' },
        },
      );

      // Store session metadata
      await this.env.SESSIONS_BUCKET.put(
        `sessions/${this.sessionState.sessionId}.meta.json`,
        JSON.stringify({
          sessionId: this.sessionState.sessionId,
          userId: this.sessionState.userId,
          username: this.sessionState.username,
          title: this.sessionState.title,
          startedAt: this.sessionState.startedAt,
          endedAt: Date.now(),
          chunkCount: chunks.length,
        }),
        {
          httpMetadata: { contentType: 'application/json' },
        },
      );
    } catch (err) {
      console.error('Error persisting session to R2:', err);
    }
  }

  /**
   * Incrementally flush new in-memory chunks to DO storage.
   * Only converts and appends chunks that haven't been flushed yet,
   * so replay data survives Durable Object hibernation.
   */
  private async persistReplayToStorage(): Promise<void> {
    if (this.sessionState?.visibility === 'private') return;

    // Only flush chunks we haven't persisted yet
    const newChunks = this.allChunks.slice(this.flushedChunkCount);
    if (newChunks.length === 0) return;

    const converted: Array<{ type: string; data: string; timestamp: number; cols?: number; rows?: number }> = [];
    for (const raw of newChunks) {
      try {
        const frame = decodeFrame(raw);
        if (frame.type === FrameType.Output) {
          const text = new TextDecoder().decode(frame.payload);
          converted.push({ type: 'output', data: text, timestamp: frame.timestamp });
        } else if (frame.type === FrameType.Resize) {
          const view = new DataView(
            frame.payload.buffer,
            frame.payload.byteOffset,
            frame.payload.byteLength,
          );
          converted.push({
            type: 'resize',
            data: '',
            timestamp: frame.timestamp,
            cols: view.getUint16(0),
            rows: view.getUint16(2),
          });
        }
      } catch {
        // Skip corrupt frames
      }
    }

    if (converted.length === 0) return;

    // Load existing persisted chunks and append
    const existing =
      await this.state.storage.get<Array<{ type: string; data: string; timestamp: number; cols?: number; rows?: number }>>(
        'replayChunks',
      ) ?? [];

    await this.state.storage.put('replayChunks', [...existing, ...converted]);
    this.flushedChunkCount = this.allChunks.length;
  }

  private async handleReplay(): Promise<Response> {
    // Ensure session state is loaded (needed for R2 fallback)
    if (!this.sessionState) {
      this.sessionState = await this.state.storage.get<SessionState>('sessionState') ?? null;
    }

    // Private sessions have no replay
    if (this.sessionState?.visibility === 'private') {
      return new Response(JSON.stringify({ chunks: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Try in-memory first (session still alive)
    if (this.allChunks.length > 0) {
      const chunks: Array<{ type: string; data: string; timestamp: number; cols?: number; rows?: number }> = [];
      for (const raw of this.allChunks) {
        try {
          const frame = decodeFrame(raw);
          if (frame.type === FrameType.Output) {
            const text = new TextDecoder().decode(frame.payload);
            chunks.push({ type: 'output', data: text, timestamp: frame.timestamp });
          } else if (frame.type === FrameType.Resize) {
            const view = new DataView(
              frame.payload.buffer,
              frame.payload.byteOffset,
              frame.payload.byteLength,
            );
            chunks.push({
              type: 'resize',
              data: '',
              timestamp: frame.timestamp,
              cols: view.getUint16(0),
              rows: view.getUint16(2),
            });
          }
        } catch {
          // Skip corrupt frames
        }
      }
      return new Response(JSON.stringify({ chunks }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fall back to DO storage (after eviction/restart)
    const stored = await this.state.storage.get<Array<{ type: string; data: string; timestamp: number; cols?: number; rows?: number }>>('replayChunks');
    if (stored && stored.length > 0) {
      return new Response(JSON.stringify({ chunks: stored }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fall back to R2 (permanent archive)
    if (this.env.SESSIONS_BUCKET && this.sessionState) {
      try {
        const r2Object = await this.env.SESSIONS_BUCKET.get(
          `sessions/${this.sessionState.sessionId}.json`,
        );
        if (r2Object) {
          return new Response(r2Object.body, {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (err) {
        console.error('Error reading replay from R2:', err);
      }
    }

    return new Response(JSON.stringify({ chunks: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async handleExport(): Promise<Response> {
    // Load session state
    if (!this.sessionState) {
      const stored = await this.state.storage.get<SessionState>('sessionState');
      if (!stored) {
        return new Response('Session not found', { status: 404 });
      }
      this.sessionState = stored;
    }

    if (this.sessionState.visibility === 'private') {
      return new Response('Export not available for private sessions', { status: 404 });
    }

    // Get chunks — prefer in-memory, fall back to DO storage
    type ReplayChunk = { type?: string; data: string; timestamp: number; cols?: number; rows?: number };
    let chunks: ReplayChunk[];

    if (this.allChunks.length > 0) {
      chunks = [];
      for (const raw of this.allChunks) {
        try {
          const frame = decodeFrame(raw);
          if (frame.type === FrameType.Output) {
            const text = new TextDecoder().decode(frame.payload);
            chunks.push({ type: 'output', data: text, timestamp: frame.timestamp });
          } else if (frame.type === FrameType.Resize) {
            const view = new DataView(
              frame.payload.buffer,
              frame.payload.byteOffset,
              frame.payload.byteLength,
            );
            chunks.push({
              type: 'resize',
              data: '',
              timestamp: frame.timestamp,
              cols: view.getUint16(0),
              rows: view.getUint16(2),
            });
          }
        } catch {
          // Skip corrupt frames
        }
      }
    } else {
      // Fall back to DO storage
      const stored = await this.state.storage.get<ReplayChunk[]>('replayChunks');
      chunks = stored ?? [];

      // Fall back to R2 if DO storage is empty
      if (chunks.length === 0 && this.env.SESSIONS_BUCKET && this.sessionState) {
        try {
          const r2Object = await this.env.SESSIONS_BUCKET.get(
            `sessions/${this.sessionState.sessionId}.json`,
          );
          if (r2Object) {
            const r2Data = await r2Object.json<{ chunks: ReplayChunk[] }>();
            chunks = r2Data.chunks ?? [];
          }
        } catch (err) {
          console.error('Error reading export data from R2:', err);
        }
      }
    }

    if (chunks.length === 0) {
      return new Response('No replay data available', { status: 404 });
    }

    // Extract initial terminal dimensions from first Resize frame (default 80x24)
    let cols = 80;
    let rows = 24;
    for (const chunk of chunks) {
      if (chunk.type === 'resize' && chunk.cols && chunk.rows) {
        cols = chunk.cols;
        rows = chunk.rows;
        break;
      }
    }

    // Build asciicast v2 header
    const header = JSON.stringify({
      version: 2,
      width: cols,
      height: rows,
      timestamp: Math.floor(this.sessionState.startedAt / 1000),
      title: this.sessionState.title,
    });

    // Build event lines from output chunks
    // Timestamps in chunks are ms; asciicast uses seconds with decimal precision
    const firstTimestamp = chunks[0].timestamp;
    const lines: string[] = [header];

    for (const chunk of chunks) {
      if (chunk.type === 'output' || !chunk.type) {
        const elapsed = (chunk.timestamp - firstTimestamp) / 1000;
        lines.push(JSON.stringify([parseFloat(elapsed.toFixed(6)), 'o', chunk.data]));
      }
    }

    const filename = `${this.sessionState.sessionId}.cast`;
    return new Response(lines.join('\n') + '\n', {
      headers: {
        'Content-Type': 'application/x-asciicast',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  async alarm(): Promise<void> {
    // Check max session duration first
    if (this.sessionState) {
      const elapsed = Date.now() - this.sessionState.startedAt;
      if (elapsed >= DEFAULT_RATE_LIMITS.maxSessionDurationMs) {
        if (this.broadcaster) {
          this.broadcaster.close(WS_CLOSE.MAX_DURATION, 'Maximum session duration reached');
        }
        return; // webSocketClose handles cleanup
      }
    }

    // No broadcaster connected — nothing to ping
    if (!this.broadcaster) {
      return;
    }

    // Dead-connection detection: no activity for 2 intervals → treat as dead
    const silenceDuration = Date.now() - this.lastBroadcasterActivity;
    if (silenceDuration > PING_INTERVAL_MS * 2) {
      await this.handleBroadcasterClose();
      return;
    }

    // Periodically flush replay chunks to DO storage so data survives hibernation
    await this.persistReplayToStorage();

    // Send app-level ping and schedule next heartbeat
    try {
      this.broadcaster.send(encodePing());
    } catch {
      // Send failed — broadcaster is gone
      await this.handleBroadcasterClose();
      return;
    }

    await this.state.storage.setAlarm(Date.now() + PING_INTERVAL_MS);
  }
}
