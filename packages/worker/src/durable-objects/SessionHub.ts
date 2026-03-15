import type { Env } from '../env.js';
import {
  decodeFrame,
  encodeEndFrame,
  encodeViewerCountFrame,
  encodeMetaFrame,
  encodePing,
  FrameType,
  WS_CLOSE,
  LATE_JOINER_BUFFER_SIZE,
  DEFAULT_RATE_LIMITS,
  PING_INTERVAL_MS,
} from '@shout/shared';
import { createDb, sessions } from '../lib/db.js';
import { eq } from 'drizzle-orm';

interface SessionState {
  sessionId: string;
  userId: string;
  username: string;
  title: string;
  startedAt: number;
}

interface BufferedChunk {
  data: Uint8Array;
  timestamp: number;
}

export class SessionHub implements DurableObject {
  private state: DurableObjectState;
  private env: Env;

  // Session metadata
  private sessionState: SessionState | null = null;

  // WebSocket connections
  private broadcaster: WebSocket | null = null;
  private viewers: Set<WebSocket> = new Set();

  // Ring buffer for late joiners
  private buffer: BufferedChunk[] = [];
  private allChunks: Uint8Array[] = [];

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

    // Send buffered chunks for late joiners
    for (const chunk of this.buffer) {
      server.send(chunk.data);
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
        this.buffer.push({ data: bytes, timestamp: now });
        if (this.buffer.length > LATE_JOINER_BUFFER_SIZE) {
          this.buffer.shift();
        }

        // Store all chunks for persistence
        this.allChunks.push(bytes);
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
    if (!this.sessionState || this.allChunks.length === 0) return;
    if (!this.env.SESSIONS_BUCKET) return; // R2 not enabled

    try {
      // Concatenate all chunks into single binary
      const totalLength = this.allChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of this.allChunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      // Store session binary data
      await this.env.SESSIONS_BUCKET.put(
        `sessions/${this.sessionState.sessionId}.bin`,
        combined,
        {
          customMetadata: {
            sessionId: this.sessionState.sessionId,
            userId: this.sessionState.userId,
          },
        },
      );

      // Store session metadata
      const metadata = {
        sessionId: this.sessionState.sessionId,
        userId: this.sessionState.userId,
        username: this.sessionState.username,
        title: this.sessionState.title,
        startedAt: this.sessionState.startedAt,
        endedAt: Date.now(),
        chunkCount: this.allChunks.length,
        totalBytes: totalLength,
      };

      await this.env.SESSIONS_BUCKET.put(
        `sessions/${this.sessionState.sessionId}.meta.json`,
        JSON.stringify(metadata),
        {
          httpMetadata: { contentType: 'application/json' },
        },
      );
    } catch (err) {
      console.error('Error persisting session:', err);
    }
  }

  private async persistReplayToStorage(): Promise<void> {
    if (this.allChunks.length === 0) return;

    const chunks: Array<{ data: string; timestamp: number }> = [];
    for (const raw of this.allChunks) {
      try {
        const frame = decodeFrame(raw);
        if (frame.type === FrameType.Output) {
          const text = new TextDecoder().decode(frame.payload);
          chunks.push({ data: text, timestamp: frame.timestamp * 1000 });
        }
      } catch {
        // Skip corrupt frames
      }
    }

    await this.state.storage.put('replayChunks', chunks);
  }

  private async handleReplay(): Promise<Response> {
    // Try in-memory first (session still alive)
    if (this.allChunks.length > 0) {
      const chunks: Array<{ data: string; timestamp: number }> = [];
      for (const raw of this.allChunks) {
        try {
          const frame = decodeFrame(raw);
          if (frame.type === FrameType.Output) {
            const text = new TextDecoder().decode(frame.payload);
            chunks.push({ data: text, timestamp: frame.timestamp * 1000 });
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
    const stored = await this.state.storage.get<Array<{ data: string; timestamp: number }>>('replayChunks');
    const chunks = stored ?? [];

    return new Response(JSON.stringify({ chunks }), {
      headers: { 'Content-Type': 'application/json' },
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
