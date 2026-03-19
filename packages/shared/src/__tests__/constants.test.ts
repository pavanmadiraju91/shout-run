import { describe, it, expect } from 'vitest';
import {
  WS_CLOSE,
  CHUNK_DEBOUNCE_MS,
  PING_INTERVAL_MS,
  API_PATHS,
  GITHUB_DEVICE_CODE_URL,
  GITHUB_ACCESS_TOKEN_URL,
  GITHUB_USER_URL,
} from '../constants.js';
import { DEFAULT_RATE_LIMITS } from '../types.js';

describe('WS_CLOSE codes', () => {
  it('NORMAL is 1000', () => {
    expect(WS_CLOSE.NORMAL).toBe(1000);
  });

  it('GOING_AWAY is 1001', () => {
    expect(WS_CLOSE.GOING_AWAY).toBe(1001);
  });

  it('SESSION_ENDED is 4000', () => {
    expect(WS_CLOSE.SESSION_ENDED).toBe(4000);
  });

  it('AUTH_FAILED is 4001', () => {
    expect(WS_CLOSE.AUTH_FAILED).toBe(4001);
  });

  it('RATE_LIMITED is 4002', () => {
    expect(WS_CLOSE.RATE_LIMITED).toBe(4002);
  });

  it('SESSION_NOT_FOUND is 4004', () => {
    expect(WS_CLOSE.SESSION_NOT_FOUND).toBe(4004);
  });

  it('MAX_DURATION is 4010', () => {
    expect(WS_CLOSE.MAX_DURATION).toBe(4010);
  });
});

describe('timing constants', () => {
  it('CHUNK_DEBOUNCE_MS is 16', () => {
    expect(CHUNK_DEBOUNCE_MS).toBe(16);
  });

  it('PING_INTERVAL_MS is 30000', () => {
    expect(PING_INTERVAL_MS).toBe(30_000);
  });
});

describe('API_PATHS', () => {
  it('AUTH_DEVICE_CODE is correct', () => {
    expect(API_PATHS.AUTH_DEVICE_CODE).toBe('/api/auth/device-code');
  });

  it('AUTH_TOKEN is correct', () => {
    expect(API_PATHS.AUTH_TOKEN).toBe('/api/auth/token');
  });

  it('AUTH_ME is correct', () => {
    expect(API_PATHS.AUTH_ME).toBe('/api/auth/me');
  });

  it('SESSIONS is correct', () => {
    expect(API_PATHS.SESSIONS).toBe('/api/sessions');
  });

  it('SESSION function returns correct path', () => {
    expect(API_PATHS.SESSION('abc123')).toBe('/api/sessions/abc123');
    expect(API_PATHS.SESSION('test-session-id')).toBe('/api/sessions/test-session-id');
  });

  it('SESSION_WS function returns correct path', () => {
    expect(API_PATHS.SESSION_WS('xyz789')).toBe('/api/sessions/xyz789/ws');
  });

  it('LIVE_SESSIONS is correct', () => {
    expect(API_PATHS.LIVE_SESSIONS).toBe('/api/sessions/live');
  });

  it('USER_SESSIONS function returns correct path', () => {
    expect(API_PATHS.USER_SESSIONS('johndoe')).toBe('/api/users/johndoe/sessions');
    expect(API_PATHS.USER_SESSIONS('jane_doe')).toBe('/api/users/jane_doe/sessions');
  });
});

describe('DEFAULT_RATE_LIMITS', () => {
  it('maxBytesPerSecond is 100KB', () => {
    expect(DEFAULT_RATE_LIMITS.maxBytesPerSecond).toBe(100 * 1024);
  });

  it('maxSessionDurationMs is 4 hours', () => {
    expect(DEFAULT_RATE_LIMITS.maxSessionDurationMs).toBe(4 * 60 * 60 * 1000);
  });

  it('maxSessionsPerDay is 50', () => {
    expect(DEFAULT_RATE_LIMITS.maxSessionsPerDay).toBe(50);
  });
});

describe('GitHub URLs', () => {
  it('GITHUB_DEVICE_CODE_URL is correct', () => {
    expect(GITHUB_DEVICE_CODE_URL).toBe('https://github.com/login/device/code');
  });

  it('GITHUB_ACCESS_TOKEN_URL is correct', () => {
    expect(GITHUB_ACCESS_TOKEN_URL).toBe('https://github.com/login/oauth/access_token');
  });

  it('GITHUB_USER_URL is correct', () => {
    expect(GITHUB_USER_URL).toBe('https://api.github.com/user');
  });
});
