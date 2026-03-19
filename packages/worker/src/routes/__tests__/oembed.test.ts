import { describe, it, expect } from 'vitest';

// Copy the regex from oembed.ts since it's not exported
const SESSION_URL_RE = /^https?:\/\/(?:www\.)?shout\.run\/([^/]+)\/([a-z0-9]+)\/?$/;

describe('oembed', () => {
  describe('SESSION_URL_RE', () => {
    it('matches valid URL', () => {
      const url = 'https://shout.run/testuser/abc123def456';
      expect(SESSION_URL_RE.test(url)).toBe(true);
    });

    it('matches URL with www', () => {
      const url = 'https://www.shout.run/testuser/abc123def456';
      expect(SESSION_URL_RE.test(url)).toBe(true);
    });

    it('matches URL with trailing slash', () => {
      const url = 'https://shout.run/testuser/abc123def456/';
      expect(SESSION_URL_RE.test(url)).toBe(true);
    });

    it('extracts username and sessionId', () => {
      const url = 'https://shout.run/johndoe/xyz789abc123';
      const match = url.match(SESSION_URL_RE);
      expect(match).not.toBeNull();
      expect(match?.[1]).toBe('johndoe');
      expect(match?.[2]).toBe('xyz789abc123');
    });

    it('rejects invalid URLs', () => {
      // No session ID
      expect(SESSION_URL_RE.test('https://shout.run/testuser')).toBe(false);
      expect(SESSION_URL_RE.test('https://shout.run/testuser/')).toBe(false);

      // Wrong domain
      expect(SESSION_URL_RE.test('https://example.com/testuser/abc123')).toBe(false);
      expect(SESSION_URL_RE.test('https://shout.io/testuser/abc123')).toBe(false);

      // Uppercase session ID
      expect(SESSION_URL_RE.test('https://shout.run/testuser/ABC123')).toBe(false);
      expect(SESSION_URL_RE.test('https://shout.run/testuser/Abc123')).toBe(false);

      // Extra path segments
      expect(SESSION_URL_RE.test('https://shout.run/testuser/abc123/extra')).toBe(false);

      // Missing protocol
      expect(SESSION_URL_RE.test('shout.run/testuser/abc123')).toBe(false);
    });
  });
});
