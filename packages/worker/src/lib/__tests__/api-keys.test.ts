import { describe, it, expect, vi } from 'vitest';

vi.mock('drizzle-orm', () => ({ eq: vi.fn(), and: vi.fn(), isNull: vi.fn() }));
vi.mock('../db.js', () => ({ apiKeys: {}, users: {} }));

import { generateApiKey, hashApiKey, isApiKey, getApiKeyPrefix } from '../api-keys.js';

describe('api-keys', () => {
  describe('generateApiKey', () => {
    it('starts with "shout_sk_"', () => {
      const key = generateApiKey();
      expect(key.startsWith('shout_sk_')).toBe(true);
    });

    it('total length is 73 (9 prefix + 64 hex)', () => {
      const key = generateApiKey();
      expect(key.length).toBe(73);
    });

    it('matches hex chars regex /^shout_sk_[0-9a-f]{64}$/', () => {
      const key = generateApiKey();
      expect(key).toMatch(/^shout_sk_[0-9a-f]{64}$/);
    });

    it('is random (two calls differ)', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashApiKey', () => {
    it('is deterministic', async () => {
      const key = 'shout_sk_test123';
      const hash1 = await hashApiKey(key);
      const hash2 = await hashApiKey(key);
      expect(hash1).toBe(hash2);
    });

    it('different inputs → different hashes', async () => {
      const hash1 = await hashApiKey('shout_sk_key1');
      const hash2 = await hashApiKey('shout_sk_key2');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('isApiKey', () => {
    it('returns true for valid API key prefix', () => {
      expect(isApiKey('shout_sk_abc123def456')).toBe(true);
    });

    it('returns false for Bearer token', () => {
      expect(isApiKey('Bearer eyJhbGciOiJIUzI1NiJ9')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isApiKey('')).toBe(false);
    });
  });

  describe('getApiKeyPrefix', () => {
    it('returns first 20 chars', () => {
      const key = 'shout_sk_1234567890abcdef1234567890abcdef';
      const prefix = getApiKeyPrefix(key);
      expect(prefix).toBe('shout_sk_1234567890a');
      expect(prefix.length).toBe(20);
    });

    it('short input returns full string', () => {
      const key = 'short';
      const prefix = getApiKeyPrefix(key);
      expect(prefix).toBe('short');
    });
  });
});
