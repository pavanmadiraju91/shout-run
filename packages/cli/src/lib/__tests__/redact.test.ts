import { describe, it, expect } from 'vitest';
import { StreamRedactor } from '../redact.js';

describe('StreamRedactor', () => {
  describe('addSecret', () => {
    it('ignores values ≤ 3 characters', () => {
      const r = new StreamRedactor();
      r.addSecret('abc');
      r.addSecret('xy');
      r.addSecret('');
      expect(r.hasSecrets).toBe(false);
    });

    it('accepts values ≥ 4 characters', () => {
      const r = new StreamRedactor();
      r.addSecret('abcd');
      expect(r.hasSecrets).toBe(true);
    });

    it('deduplicates identical values', () => {
      const r = new StreamRedactor();
      r.addSecret('secret-value-123');
      r.addSecret('secret-value-123');
      // No public way to check count, but redact should still work
      expect(r.redact('secret-value-123')).toBe('');
      expect(r.flush()).toBe('[REDACTED]');
    });
  });

  describe('collectFromEnv', () => {
    it('collects values of sensitive env vars', () => {
      const r = new StreamRedactor();
      r.collectFromEnv({
        GITHUB_TOKEN: 'ghp_abc123def456',
        HOME: '/home/user',
        OPENAI_API_KEY: 'sk-proj-abcdef',
      });
      expect(r.hasSecrets).toBe(true);
      const result = r.redact('token is ghp_abc123def456 and key is sk-proj-abcdef');
      const flushed = r.flush();
      expect(result + flushed).toBe('token is [REDACTED] and key is [REDACTED]');
    });

    it('skips short values', () => {
      const r = new StreamRedactor();
      r.collectFromEnv({ GITHUB_TOKEN: '1' });
      expect(r.hasSecrets).toBe(false);
    });

    it('skips undefined values', () => {
      const r = new StreamRedactor();
      r.collectFromEnv({ GITHUB_TOKEN: undefined });
      expect(r.hasSecrets).toBe(false);
    });
  });

  describe('redact', () => {
    it('replaces known secrets with [REDACTED]', () => {
      const r = new StreamRedactor();
      r.addSecret('my-secret-token');
      const result = r.redact('the token is my-secret-token here');
      const flushed = r.flush();
      expect(result + flushed).toBe('the token is [REDACTED] here');
    });

    it('leaves text without secrets unchanged', () => {
      const r = new StreamRedactor();
      r.addSecret('some-secret-value');
      const result = r.redact('hello world');
      const flushed = r.flush();
      expect(result + flushed).toBe('hello world');
    });

    it('returns data as-is when no secrets registered', () => {
      const r = new StreamRedactor();
      expect(r.redact('anything goes')).toBe('anything goes');
    });

    it('handles multiple occurrences in one chunk', () => {
      const r = new StreamRedactor();
      r.addSecret('token123');
      const result = r.redact('A token123 B token123 C');
      const flushed = r.flush();
      expect(result + flushed).toBe('A [REDACTED] B [REDACTED] C');
    });

    it('handles multiple different secrets', () => {
      const r = new StreamRedactor();
      r.addSecret('secret-one');
      r.addSecret('secret-two');
      const result = r.redact('first: secret-one second: secret-two');
      const flushed = r.flush();
      expect(result + flushed).toBe('first: [REDACTED] second: [REDACTED]');
    });

    it('handles secret split across two chunks', () => {
      const r = new StreamRedactor();
      r.addSecret('ghp_abc123def456');
      // Secret split: "ghp_abc123" in chunk 1, "def456" in chunk 2
      const out1 = r.redact('token: ghp_abc123');
      const out2 = r.redact('def456 done');
      const flushed = r.flush();
      const combined = out1 + out2 + flushed;
      expect(combined).toBe('token: [REDACTED] done');
    });

    it('does not corrupt ANSI escape sequences around a secret', () => {
      const r = new StreamRedactor();
      r.addSecret('my-api-key-12345');
      const ansi = '\x1b[32mmy-api-key-12345\x1b[0m';
      const result = r.redact(ansi);
      const flushed = r.flush();
      const combined = result + flushed;
      // ANSI codes should be preserved, only the secret text replaced
      expect(combined).toBe('\x1b[32m[REDACTED]\x1b[0m');
    });

    it('handles empty string input', () => {
      const r = new StreamRedactor();
      r.addSecret('some-secret');
      expect(r.redact('')).toBe('');
    });
  });

  describe('flush', () => {
    it('returns empty string when no overlap', () => {
      const r = new StreamRedactor();
      expect(r.flush()).toBe('');
    });

    it('flushes and redacts remaining overlap buffer', () => {
      const r = new StreamRedactor();
      r.addSecret('long-secret-value');
      // Send a chunk that's shorter than the secret — it'll be buffered
      const out1 = r.redact('has long-secret-value inside');
      const flushed = r.flush();
      expect(out1 + flushed).toBe('has [REDACTED] inside');
    });
  });
});
