/** WebSocket close codes */
export const WS_CLOSE = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  SESSION_ENDED: 4000,
  AUTH_FAILED: 4001,
  RATE_LIMITED: 4002,
  SESSION_NOT_FOUND: 4004,
  MAX_DURATION: 4010,
} as const;

/** Debounce interval for batching terminal output */
export const CHUNK_DEBOUNCE_MS = 16;

/** Max chunks kept in memory for late joiners */
export const LATE_JOINER_BUFFER_SIZE = 100;

/** Keepalive ping interval */
export const PING_INTERVAL_MS = 30_000;

/** API base paths */
export const API_PATHS = {
  AUTH_DEVICE_CODE: '/api/auth/device-code',
  AUTH_TOKEN: '/api/auth/token',
  AUTH_ME: '/api/auth/me',
  SESSIONS: '/api/sessions',
  SESSION: (id: string) => `/api/sessions/${id}`,
  SESSION_WS: (id: string) => `/api/sessions/${id}/ws`,
  LIVE_SESSIONS: '/api/sessions/live',
  USER_SESSIONS: (username: string) => `/api/users/${username}/sessions`,
} as const;

/** GitHub OAuth */
export const GITHUB_DEVICE_CODE_URL = 'https://github.com/login/device/code';
export const GITHUB_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_USER_URL = 'https://api.github.com/user';

