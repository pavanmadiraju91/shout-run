// ── User ──────────────────────────────────────────────────────
export interface User {
  id: string;
  githubId: number;
  username: string;
  avatarUrl: string;
  createdAt: string;
}

// ── Session ───────────────────────────────────────────────────
export type SessionStatus = 'live' | 'ended';
export type SessionVisibility = 'public' | 'followers' | 'private';

export interface Session {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: SessionStatus;
  visibility: SessionVisibility;
  viewerCount: number;
  tags: string[];
  startedAt: string;
  endedAt?: string;
}

export interface SessionSummary {
  id: string;
  username: string;
  avatarUrl: string;
  title: string;
  description?: string;
  viewerCount: number;
  upvotes: number;
  startedAt: string;
}

// ── Auth ──────────────────────────────────────────────────────
export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

export interface AuthTokens {
  accessToken: string;
  username: string;
  avatarUrl: string;
}

// ── API ──────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface CreateSessionRequest {
  title?: string;
  description?: string;
  visibility?: SessionVisibility;
  tags?: string[];
}

export interface CreateSessionResponse {
  sessionId: string;
  wsUrl: string;
}

// ── Secret Detection ─────────────────────────────────────────
export type SecretConfidence = 'high' | 'medium';

export interface SecretPattern {
  name: string;
  pattern: string;
  confidence: SecretConfidence;
  replacement: string;
}

export interface SecretMatch {
  name: string;
  start: number;
  end: number;
  confidence: SecretConfidence;
}

// ── Rate Limiting ────────────────────────────────────────────
export interface RateLimits {
  maxBytesPerSecond: number;
  maxSessionDurationMs: number;
  maxSessionsPerDay: number;
}

export const DEFAULT_RATE_LIMITS: RateLimits = {
  maxBytesPerSecond: 100 * 1024, // 100KB/s
  maxSessionDurationMs: 4 * 60 * 60 * 1000, // 4 hours
  maxSessionsPerDay: 50,
};
