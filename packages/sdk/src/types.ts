export type ShoutSessionState = 'idle' | 'connecting' | 'live' | 'ending' | 'ended';

export interface ShoutSessionOptions {
  /** API key (starts with shout_sk_) */
  apiKey: string;
  /** Session title */
  title?: string;
  /** Session visibility */
  visibility?: 'public' | 'followers' | 'private';
  /** Terminal columns (default: 80) */
  cols?: number;
  /** Terminal rows (default: 24) */
  rows?: number;
  /** API base URL (default: https://api.shout.run) */
  apiUrl?: string;
  /** Secret values to redact from broadcast output */
  redactSecrets?: string[];
}

export interface ShoutSessionInfo {
  sessionId: string;
  url: string;
  wsUrl: string;
}

export interface ShoutSessionEvents {
  connected: () => void;
  disconnected: (code: number, reason: string) => void;
  reconnecting: (attempt: number) => void;
  viewers: (count: number) => void;
  error: (error: Error) => void;
  stateChange: (state: ShoutSessionState) => void;
}

// ── Search API Types ─────────────────────────────────────────

export interface SessionSearchResult {
  id: string;
  title: string;
  description?: string;
  tags: string[];
  username: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  upvotes: number;
  viewerCount: number;
  avatarUrl?: string;
}

export interface SessionContent {
  session: SessionSearchResult;
  transcript: string;
}

export interface SearchSessionsOptions {
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by session status */
  status?: 'live' | 'ended';
  /** Maximum results (1-50, default: 20) */
  limit?: number;
  /** Cursor for pagination (session ID) */
  cursor?: string;
  /** API base URL (default: https://api.shout.run) */
  apiUrl?: string;
}

export interface GetSessionContentOptions {
  /** API base URL (default: https://api.shout.run) */
  apiUrl?: string;
}
