/**
 * Functional test — exercises StreamRedactor end-to-end with realistic
 * scenarios: env var collection, multi-secret streams, ANSI codes,
 * chunk splitting, and cat-.env output.
 */
import { describe, it, expect } from 'vitest';
import { StreamRedactor } from '../redact.js';
import { collectSensitiveValues } from '../env.js';

describe('StreamRedactor (functional)', () => {
  function makeRedactor() {
    const r = new StreamRedactor();
    const env = {
      GITHUB_TOKEN: 'ghp_abc123def456789xyz',
      OPENAI_API_KEY: 'sk-proj-abcdefghijklmnop',
      AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      ANTHROPIC_API_KEY: 'sk-ant-api03-longtoken123456',
      HOME: '/home/user',
      PATH: '/usr/bin',
      TERM: 'xterm-256color',
      EDITOR: 'vim',
    };
    for (const val of collectSensitiveValues(env)) {
      r.addSecret(val);
    }
    return r;
  }

  function fullRedact(r: StreamRedactor, ...chunks: string[]) {
    let out = '';
    for (const chunk of chunks) out += r.redact(chunk);
    out += r.flush();
    return out;
  }

  it('redacts a GitHub token echoed by an agent', () => {
    const r = makeRedactor();
    const out = fullRedact(r, '$ echo $GITHUB_TOKEN\nghp_abc123def456789xyz\n$ ');
    expect(out).not.toContain('ghp_abc123def456789xyz');
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('$ echo $GITHUB_TOKEN');
  });

  it('redacts multiple secrets in a single stream', () => {
    const r = makeRedactor();
    const out = fullRedact(r, 'GH=ghp_abc123def456789xyz OPENAI=sk-proj-abcdefghijklmnop');
    expect(out).not.toContain('ghp_abc123def456789xyz');
    expect(out).not.toContain('sk-proj-abcdefghijklmnop');
    expect(out.match(/\[REDACTED\]/g)?.length).toBe(2);
  });

  it('does not redact safe env values like HOME or PATH', () => {
    const r = makeRedactor();
    const out = fullRedact(r, 'home=/home/user path=/usr/bin');
    expect(out).toBe('home=/home/user path=/usr/bin');
  });

  it('redacts secret inside ANSI-colored output', () => {
    const r = makeRedactor();
    const out = fullRedact(r, '\x1b[33mToken: ghp_abc123def456789xyz\x1b[0m');
    expect(out).not.toContain('ghp_abc123def456789xyz');
    expect(out).toContain('[REDACTED]');
    // ANSI codes should survive
    expect(out).toContain('\x1b[33m');
    expect(out).toContain('\x1b[0m');
  });

  it('redacts a secret split across two PTY chunks', () => {
    const r = makeRedactor();
    const secret = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    const half = Math.floor(secret.length / 2);
    const out = fullRedact(
      r,
      'key=' + secret.slice(0, half),
      secret.slice(half) + '\n',
    );
    expect(out).not.toContain('wJalrXUtnFEMI');
    expect(out).toContain('[REDACTED]');
  });

  it('redacts secrets in simulated cat .env output', () => {
    const r = makeRedactor();
    const envFile = [
      'DATABASE_URL=postgres://localhost:5432/mydb',
      'GITHUB_TOKEN=ghp_abc123def456789xyz',
      'OPENAI_API_KEY=sk-proj-abcdefghijklmnop',
      'DEBUG=true',
    ].join('\n');
    const out = fullRedact(r, envFile);
    expect(out).not.toContain('ghp_abc123def456789xyz');
    expect(out).not.toContain('sk-proj-abcdefghijklmnop');
    expect(out).toContain('DATABASE_URL=postgres://localhost:5432/mydb');
    expect(out).toContain('DEBUG=true');
  });

  it('handles rapid small chunks (character-by-character streaming)', () => {
    const r = makeRedactor();
    const text = 'Token: ghp_abc123def456789xyz end';
    let out = '';
    // Simulate character-by-character output
    for (const ch of text) out += r.redact(ch);
    out += r.flush();
    expect(out).not.toContain('ghp_abc123def456789xyz');
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('Token: ');
  });

  it('handles a secret repeated back-to-back', () => {
    const r = makeRedactor();
    const out = fullRedact(r, 'ghp_abc123def456789xyzghp_abc123def456789xyz');
    expect(out).not.toContain('ghp_abc123');
    expect(out.match(/\[REDACTED\]/g)?.length).toBe(2);
  });

  it('--no-redact: empty redactor passes through everything', () => {
    const r = new StreamRedactor(); // no secrets added
    const out = fullRedact(r, 'ghp_abc123def456789xyz sk-proj-secret');
    expect(out).toBe('ghp_abc123def456789xyz sk-proj-secret');
  });

  it('redacts Anthropic API key from agent debug output', () => {
    const r = makeRedactor();
    const out = fullRedact(
      r,
      '[DEBUG] Using API key: sk-ant-api03-longtoken123456\n',
      '[DEBUG] Request sent to api.anthropic.com\n',
    );
    expect(out).not.toContain('sk-ant-api03-longtoken123456');
    expect(out).toContain('[REDACTED]');
    expect(out).toContain('api.anthropic.com');
  });
});
