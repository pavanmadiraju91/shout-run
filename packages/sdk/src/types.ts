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
