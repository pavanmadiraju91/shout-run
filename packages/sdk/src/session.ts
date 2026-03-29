import { EventEmitter } from 'node:events';
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
  StreamRedactor,
  type CreateSessionResponse,
  type ApiResponse,
} from '@shout/shared';
import { ReconnectingWebSocket } from './ws.js';
import type {
  ShoutSessionOptions,
  ShoutSessionInfo,
  ShoutSessionState,
  ShoutSessionEvents,
  SessionSearchResult,
  SessionContent,
  SearchSessionsOptions,
  GetSessionContentOptions,
} from './types.js';

const MAX_CHUNK_BYTES = 64 * 1024; // 64 KB
const DEFAULT_API_URL = 'https://api.shout.run';

export class ShoutSession extends EventEmitter {
  private apiKey: string;
  private title: string;
  private visibility: 'public' | 'followers' | 'private';
  private cols: number;
  private rows: number;
  private apiUrl: string;

  private sessionId: string | null = null;
  private ws: ReconnectingWebSocket | null = null;
  private _state: ShoutSessionState = 'idle';
  private startTime = 0;
  private viewerCount = 0;

  // Buffering and rate limiting
  private buffer = '';
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private bytesThisSecond = 0;
  private lastSecondReset = 0;
  private maxBytesPerSecond = DEFAULT_RATE_LIMITS.maxBytesPerSecond;
  private redactor: StreamRedactor;

  constructor(options: ShoutSessionOptions) {
    super();
    this.apiKey = options.apiKey;
    this.title = options.title ?? 'SDK Session';
    this.visibility = options.visibility ?? 'public';
    this.cols = options.cols ?? 80;
    this.rows = options.rows ?? 24;
    this.apiUrl = options.apiUrl ?? 'https://api.shout.run';
    this.redactor = new StreamRedactor();
    if (options.redactSecrets) {
      for (const secret of options.redactSecrets) {
        this.redactor.addSecret(secret);
      }
    }
  }

  get state(): ShoutSessionState {
    return this._state;
  }

  get viewers(): number {
    return this.viewerCount;
  }

  get id(): string | null {
    return this.sessionId;
  }

  private setState(state: ShoutSessionState): void {
    this._state = state;
    this.emit('stateChange', state);
  }

  async start(): Promise<ShoutSessionInfo> {
    if (this._state !== 'idle') {
      throw new Error(`Cannot start session in state: ${this._state}`);
    }

    this.setState('connecting');

    // 1. Create session via HTTP
    const response = await fetch(`${this.apiUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: this.title,
        visibility: this.visibility,
      }),
    });

    if (!response.ok) {
      this.setState('idle');
      const error = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(error.error ?? `Failed to create session: ${response.status}`);
    }

    const result = (await response.json()) as ApiResponse<CreateSessionResponse>;
    if (!result.ok || !result.data) {
      this.setState('idle');
      throw new Error(result.error ?? 'Failed to create session');
    }

    this.sessionId = result.data.sessionId;
    this.startTime = Date.now();
    this.lastSecondReset = this.startTime;

    // 2. Connect WebSocket with API key as query param
    const wsUrlWithAuth = `${result.data.wsUrl}?token=${encodeURIComponent(this.apiKey)}`;
    this.ws = new ReconnectingWebSocket(wsUrlWithAuth);

    // Set up WebSocket event handlers
    this.ws.on('open', () => {
      this.setState('live');
      // Send initial terminal size
      this.ws!.send(encodeResizeFrame(this.cols, this.rows));
      this.emit('connected');
    });

    this.ws.on('close', (code, reason) => {
      if (this._state !== 'ending' && this._state !== 'ended') {
        this.emit('disconnected', code, reason);
      }
    });

    this.ws.on('message', (data) => {
      if (data instanceof ArrayBuffer) {
        try {
          const frame = decodeFrame(new Uint8Array(data));
          if (frame.type === FrameType.Ping) {
            this.ws!.send(encodePong());
            return;
          }
          if (frame.type === FrameType.ViewerCount) {
            this.viewerCount = decodeViewerCount(frame.payload);
            this.emit('viewers', this.viewerCount);
          }
          if (frame.type === FrameType.Error) {
            const decoder = new TextDecoder();
            this.emit('error', new Error(decoder.decode(frame.payload)));
          }
        } catch {
          // Ignore decode errors
        }
      }
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('reconnecting', (attempt) => {
      this.emit('reconnecting', attempt);
    });

    // Connect the WebSocket
    this.ws.connect();

    // Derive the viewer URL from the API URL
    const webBase = this.apiUrl.replace('api.', '').replace(/:\d+$/, '');
    const info: ShoutSessionInfo = {
      sessionId: result.data.sessionId,
      url: `${webBase}/${result.data.username}/${result.data.sessionId}`,
      wsUrl: result.data.wsUrl,
    };

    return info;
  }

  write(data: string | Buffer): void {
    if (this._state !== 'live' && this._state !== 'connecting') {
      return; // Silently ignore writes when not live
    }

    const str = typeof data === 'string' ? data : data.toString('utf-8');
    const safe = this.redactor.redact(str);
    if (safe) {
      this.buffer += safe;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.flushBuffer(), CHUNK_DEBOUNCE_MS);
  }

  /** Add a secret value to redact from broadcast output at runtime. */
  addSecret(value: string): void {
    this.redactor.addSecret(value);
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    if (this.ws && this._state === 'live') {
      this.ws.send(encodeResizeFrame(cols, rows));
    }
  }

  async end(): Promise<void> {
    if (this._state === 'ended' || this._state === 'ending') {
      return;
    }

    this.setState('ending');

    // Flush remaining buffer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    const remaining = this.redactor.flush();
    if (remaining) this.buffer += remaining;
    this.flushBuffer();

    // Send end frame
    if (this.ws) {
      try {
        this.ws.send(encodeEndFrame());
      } catch {
        // WebSocket may already be closed
      }
    }

    // End session via HTTP
    if (this.sessionId) {
      try {
        await fetch(`${this.apiUrl}/api/sessions/${this.sessionId}/end`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        });
      } catch {
        // Best effort
      }
    }

    // Close WebSocket
    if (this.ws) {
      this.ws.close(WS_CLOSE.NORMAL, 'Session ended');
      this.ws = null;
    }

    this.setState('ended');
  }

  private sendChunk(data: string): void {
    if (!this.ws) return;
    const timestampMs = Date.now() - this.startTime;
    const frame = encodeOutputFrame(data, timestampMs);
    this.ws.send(frame);
  }

  private flushBuffer(): void {
    if (this.buffer.length === 0 || !this.ws) return;

    const now = Date.now();
    if (now - this.lastSecondReset >= 1000) {
      this.bytesThisSecond = 0;
      this.lastSecondReset = now;
    }

    const raw = this.buffer;
    this.buffer = '';

    const totalBytes = Buffer.byteLength(raw, 'utf-8');

    // Rate limiting
    if (this.bytesThisSecond + totalBytes > this.maxBytesPerSecond) {
      setTimeout(() => {
        this.buffer = raw + this.buffer;
        this.flushBuffer();
      }, 1000 - (now - this.lastSecondReset));
      return;
    }

    this.bytesThisSecond += totalBytes;

    // Chunk large payloads using byte-safe splitting
    if (totalBytes <= MAX_CHUNK_BYTES) {
      this.sendChunk(raw);
    } else {
      const encoder = new TextEncoder();
      const encoded = encoder.encode(raw);
      let offset = 0;
      while (offset < encoded.byteLength) {
        const end = Math.min(offset + MAX_CHUNK_BYTES, encoded.byteLength);
        const chunk = new TextDecoder().decode(encoded.slice(offset, end));
        this.sendChunk(chunk);
        offset = end;
      }
    }
  }

  // ── Static Methods for Search API ────────────────────────────

  /**
   * Search for sessions by query, tags, and status.
   * @param apiKey - API key for authentication
   * @param query - Search query (matches title and description)
   * @param options - Optional filters and pagination
   * @returns Array of matching sessions
   */
  static async searchSessions(
    apiKey: string,
    query: string,
    options?: SearchSessionsOptions,
  ): Promise<SessionSearchResult[]> {
    const apiUrl = options?.apiUrl ?? DEFAULT_API_URL;

    const params = new URLSearchParams({ q: query });
    if (options?.tags && options.tags.length > 0) {
      params.set('tags', options.tags.join(','));
    }
    if (options?.status) {
      params.set('status', options.status);
    }
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }
    if (options?.cursor) {
      params.set('cursor', options.cursor);
    }

    const response = await fetch(`${apiUrl}/api/sessions/search?${params.toString()}`);

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(error.error ?? `Search failed: ${response.status}`);
    }

    const result = (await response.json()) as ApiResponse<SessionSearchResult[]>;
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Search failed');
    }

    return result.data;
  }

  /**
   * Get the content (metadata + plain-text transcript) of a session.
   * @param apiKey - API key for authentication
   * @param sessionId - Session ID to fetch
   * @param options - Optional API URL override
   * @returns Session metadata and transcript
   */
  static async getSessionContent(
    apiKey: string,
    sessionId: string,
    options?: GetSessionContentOptions,
  ): Promise<SessionContent> {
    const apiUrl = options?.apiUrl ?? DEFAULT_API_URL;

    const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/content`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(error.error ?? `Failed to get session content: ${response.status}`);
    }

    const result = (await response.json()) as ApiResponse<SessionContent>;
    if (!result.ok || !result.data) {
      throw new Error(result.error ?? 'Failed to get session content');
    }

    return result.data;
  }
}

// Re-export types for convenience
export type {
  ShoutSessionOptions,
  ShoutSessionInfo,
  ShoutSessionState,
  ShoutSessionEvents,
  SessionSearchResult,
  SessionContent,
  SearchSessionsOptions,
  GetSessionContentOptions,
};
