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

import init, { VtParser } from '../lib/vt-wasm/vt_wasm.js';
import vtWasmModule from '../lib/vt-wasm/vt_wasm_bg.wasm';

let wasmReady = false;
async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    await init(vtWasmModule);
    wasmReady = true;
  }
}

/** JSON chunk format used in replay storage and API responses. */
type ReplayChunk = { type: string; data: string; timestamp: number; cols?: number; rows?: number };

/** Max parts to consolidate into a single replay.json (~100 MB at ~3 MB/part). */
const MAX_CONSOLIDATION_PARTS = 33;

interface SessionState {
  sessionId: string;
  userId: string;
  username: string;
  title: string;
  description?: string;
  visibility?: 'public' | 'followers' | 'private';
  startedAt: number;
}

interface R2FlushState {
  flushedPartCount: number;
  totalFlushedChunks: number;
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

  // Pending buffer — flushed to R2 every 30s by alarm
  private pendingChunks: Uint8Array[] = [];
  private pendingChunksBytes = 0;

  // R2 flush tracking — persisted to DO storage for crash recovery
  private flushedPartCount = 0;
  private totalFlushedChunks = 0;

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

    // Restore R2 flush state from DO storage (survives hibernation)
    this.state.blockConcurrencyWhile(async () => {
      const saved = await this.state.storage.get<R2FlushState>('r2FlushState');
      if (saved) {
        this.flushedPartCount = saved.flushedPartCount;
        this.totalFlushedChunks = saved.totalFlushedChunks;
      }
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
      await this.flushPendingToR2();
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

  // Guard against double execution of handleBroadcasterClose
  private isClosingBroadcaster = false;

  private async handleBroadcasterUpgrade(request: Request): Promise<Response> {
    // Replace stale broadcaster instead of rejecting — fixes reconnection 409 loop
    if (this.broadcaster) {
      try {
        this.broadcaster.close(WS_CLOSE.GOING_AWAY, 'Replaced by new connection');
      } catch { /* already dead */ }
      this.broadcaster = null;
    }

    // Cancel any pending close cleanup — broadcaster is reconnecting
    this.isClosingBroadcaster = false;

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
        await ensureWasm();
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
          await ensureWasm();
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

        // Buffer chunks for R2 persistence — skip for private sessions
        if (this.sessionState?.visibility !== 'private') {
          this.pendingChunks.push(bytes);
          this.pendingChunksBytes += bytes.byteLength;
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
      // Don't end the session immediately — give the broadcaster time to reconnect.
      // The alarm handler will clean up if no reconnection happens.
      this.broadcaster = null;
      await this.state.storage.setAlarm(Date.now() + PING_INTERVAL_MS);
    } else {
      this.viewers.delete(ws);
      this.broadcastViewerCount();
    }
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    if (ws === this.broadcaster) {
      // Don't end the session immediately — give the broadcaster time to reconnect.
      this.broadcaster = null;
      await this.state.storage.setAlarm(Date.now() + PING_INTERVAL_MS);
    } else {
      this.viewers.delete(ws);
      this.broadcastViewerCount();
    }
  }

  private async handleBroadcasterClose(): Promise<void> {
    if (this.isClosingBroadcaster) return;
    this.isClosingBroadcaster = true;

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

    // Flush remaining pending chunks to R2
    await this.flushPendingToR2();

    // Write manifest and consolidate replay
    await this.writeManifest();
    await this.consolidateReplay();

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

    this.isClosingBroadcaster = false;
  }

  /**
   * Convert pending binary frames to JSON and write as a numbered part to R2.
   * Called every 30s by the alarm and on session end.
   */
  async flushPendingToR2(): Promise<void> {
    if (this.sessionState?.visibility === 'private') return;
    if (this.pendingChunks.length === 0) return;
    if (!this.env.SESSIONS_BUCKET) return;
    if (!this.sessionState) return;

    const chunks = this.convertBinaryToJson(this.pendingChunks);
    if (chunks.length === 0) {
      this.pendingChunks = [];
      this.pendingChunksBytes = 0;
      return;
    }

    const partKey = `sessions/${this.sessionState.sessionId}/part-${String(this.flushedPartCount).padStart(6, '0')}.json`;

    try {
      await this.env.SESSIONS_BUCKET.put(partKey, JSON.stringify({ chunks }), {
        httpMetadata: { contentType: 'application/json' },
      });

      this.totalFlushedChunks += chunks.length;
      this.flushedPartCount++;
      this.pendingChunks = [];
      this.pendingChunksBytes = 0;

      // Persist flush state for crash recovery
      await this.state.storage.put<R2FlushState>('r2FlushState', {
        flushedPartCount: this.flushedPartCount,
        totalFlushedChunks: this.totalFlushedChunks,
      });
    } catch (err) {
      // Keep chunks in memory — retry on next alarm
      console.error('Error flushing to R2:', err);
    }
  }

  /**
   * Write manifest.json and meta.json to R2 after session ends.
   */
  private async writeManifest(): Promise<void> {
    if (this.sessionState?.visibility === 'private') return;
    if (!this.env.SESSIONS_BUCKET) return;
    if (!this.sessionState) return;
    if (this.flushedPartCount === 0) return;

    const prefix = `sessions/${this.sessionState.sessionId}`;

    try {
      await this.env.SESSIONS_BUCKET.put(
        `${prefix}/manifest.json`,
        JSON.stringify({
          partCount: this.flushedPartCount,
          totalChunks: this.totalFlushedChunks,
        }),
        { httpMetadata: { contentType: 'application/json' } },
      );

      await this.env.SESSIONS_BUCKET.put(
        `${prefix}/meta.json`,
        JSON.stringify({
          sessionId: this.sessionState.sessionId,
          userId: this.sessionState.userId,
          username: this.sessionState.username,
          title: this.sessionState.title,
          startedAt: this.sessionState.startedAt,
          endedAt: Date.now(),
          chunkCount: this.totalFlushedChunks,
          partCount: this.flushedPartCount,
        }),
        { httpMetadata: { contentType: 'application/json' } },
      );
    } catch (err) {
      console.error('Error writing manifest to R2:', err);
    }
  }

  /**
   * Read all R2 parts and write a single replay.json for fast replay.
   * Skips consolidation if too many parts (> MAX_CONSOLIDATION_PARTS).
   */
  private async consolidateReplay(): Promise<void> {
    if (this.sessionState?.visibility === 'private') return;
    if (!this.env.SESSIONS_BUCKET) return;
    if (!this.sessionState) return;
    if (this.flushedPartCount === 0) return;
    if (this.flushedPartCount > MAX_CONSOLIDATION_PARTS) return;

    const prefix = `sessions/${this.sessionState.sessionId}`;

    try {
      const allChunks: ReplayChunk[] = [];
      for (let i = 0; i < this.flushedPartCount; i++) {
        const partKey = `${prefix}/part-${String(i).padStart(6, '0')}.json`;
        const obj = await this.env.SESSIONS_BUCKET.get(partKey);
        if (obj) {
          const data = await obj.json<{ chunks: ReplayChunk[] }>();
          allChunks.push(...(data.chunks ?? []));
        }
      }

      if (allChunks.length > 0) {
        await this.env.SESSIONS_BUCKET.put(
          `${prefix}/replay.json`,
          JSON.stringify({ chunks: allChunks }),
          { httpMetadata: { contentType: 'application/json' } },
        );
      }
    } catch (err) {
      console.error('Error consolidating replay:', err);
    }
  }

  // ── Replay & Export ──────────────────────────────────────────

  /**
   * Collect all available chunks: flushed R2 parts + pending memory buffer.
   * Used during live sessions to give a complete replay.
   */
  private async collectAllChunks(): Promise<ReplayChunk[]> {
    const allChunks: ReplayChunk[] = [];

    // Read flushed R2 parts
    if (this.env.SESSIONS_BUCKET && this.sessionState && this.flushedPartCount > 0) {
      const prefix = `sessions/${this.sessionState.sessionId}`;
      for (let i = 0; i < this.flushedPartCount; i++) {
        try {
          const partKey = `${prefix}/part-${String(i).padStart(6, '0')}.json`;
          const obj = await this.env.SESSIONS_BUCKET.get(partKey);
          if (obj) {
            const data = await obj.json<{ chunks: ReplayChunk[] }>();
            allChunks.push(...(data.chunks ?? []));
          }
        } catch {
          // Skip unreadable parts
        }
      }
    }

    // Add pending memory buffer
    if (this.pendingChunks.length > 0) {
      allChunks.push(...this.convertBinaryToJson(this.pendingChunks));
    }

    return allChunks;
  }

  /**
   * Read replay from R2 for ended sessions.
   * Tries consolidated replay.json first, then falls back to reading individual parts.
   */
  private async readReplayFromR2(): Promise<ReplayChunk[]> {
    if (!this.env.SESSIONS_BUCKET || !this.sessionState) return [];

    const prefix = `sessions/${this.sessionState.sessionId}`;

    // Try consolidated replay.json first (fast path)
    try {
      const consolidated = await this.env.SESSIONS_BUCKET.get(`${prefix}/replay.json`);
      if (consolidated) {
        const data = await consolidated.json<{ chunks: ReplayChunk[] }>();
        return data.chunks ?? [];
      }
    } catch {
      // Fall through to parts
    }

    // Try reading manifest + individual parts
    try {
      const manifestObj = await this.env.SESSIONS_BUCKET.get(`${prefix}/manifest.json`);
      if (manifestObj) {
        const manifest = await manifestObj.json<{ partCount: number; totalChunks: number }>();
        const allChunks: ReplayChunk[] = [];
        for (let i = 0; i < manifest.partCount; i++) {
          const partKey = `${prefix}/part-${String(i).padStart(6, '0')}.json`;
          const obj = await this.env.SESSIONS_BUCKET.get(partKey);
          if (obj) {
            const data = await obj.json<{ chunks: ReplayChunk[] }>();
            allChunks.push(...(data.chunks ?? []));
          }
        }
        return allChunks;
      }
    } catch {
      // Fall through to legacy
    }

    // Try legacy single-file format: sessions/{id}.json
    try {
      const legacy = await this.env.SESSIONS_BUCKET.get(
        `sessions/${this.sessionState.sessionId}.json`,
      );
      if (legacy) {
        const data = await legacy.json<{ chunks: ReplayChunk[] }>();
        return data.chunks ?? [];
      }
    } catch {
      // No R2 data
    }

    return [];
  }

  private async handleReplay(): Promise<Response> {
    // Ensure session state is loaded
    if (!this.sessionState) {
      this.sessionState = (await this.state.storage.get<SessionState>('sessionState')) ?? null;
    }

    // Private sessions have no replay
    if (this.sessionState?.visibility === 'private') {
      return new Response(JSON.stringify({ chunks: [] }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Live session — combine R2 parts + pending memory
    if (this.pendingChunks.length > 0 || (this.flushedPartCount > 0 && this.broadcaster)) {
      const chunks = await this.collectAllChunks();
      return new Response(JSON.stringify({ chunks }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. R2 new format (consolidated or parts) + legacy format
    if (this.env.SESSIONS_BUCKET && this.sessionState) {
      const chunks = await this.readReplayFromR2();
      if (chunks.length > 0) {
        return new Response(JSON.stringify({ chunks }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. DO storage legacy fallback
    const stored = await this.state.storage.get<ReplayChunk[]>('replayChunks');
    if (stored && stored.length > 0) {
      return new Response(JSON.stringify({ chunks: stored }), {
        headers: { 'Content-Type': 'application/json' },
      });
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

    // Get chunks — try live → R2 → DO storage legacy
    let chunks: ReplayChunk[];

    if (this.pendingChunks.length > 0 || (this.flushedPartCount > 0 && this.broadcaster)) {
      chunks = await this.collectAllChunks();
    } else {
      chunks = await this.readReplayFromR2();

      // Fall back to DO storage legacy
      if (chunks.length === 0) {
        const stored = await this.state.storage.get<ReplayChunk[]>('replayChunks');
        chunks = stored ?? [];
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

  // ── Utilities ────────────────────────────────────────────────

  /** Convert binary Uint8Array frames to JSON ReplayChunk format. */
  private convertBinaryToJson(rawFrames: Uint8Array[]): ReplayChunk[] {
    const chunks: ReplayChunk[] = [];
    for (const raw of rawFrames) {
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
    return chunks;
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

    // No broadcaster connected — clean up if stale, otherwise reschedule
    if (!this.broadcaster) {
      if (this.sessionState) {
        const lastActivity = this.lastBroadcasterActivity || this.sessionState.startedAt;
        if (Date.now() - lastActivity > PING_INTERVAL_MS * 2) {
          // Session has been live without a broadcaster for too long — end it
          await this.handleBroadcasterClose();
        } else {
          // Broadcaster might reconnect — reschedule
          await this.state.storage.setAlarm(Date.now() + PING_INTERVAL_MS);
        }
      }
      return;
    }

    // Dead-connection detection: no activity for 2 intervals → treat as dead
    const silenceDuration = Date.now() - this.lastBroadcasterActivity;
    if (silenceDuration > PING_INTERVAL_MS * 2) {
      await this.handleBroadcasterClose();
      return;
    }

    // Flush pending chunks to R2
    await this.flushPendingToR2();

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
