import { readFileSync } from 'node:fs';
import { SENSITIVE_ENV_PREFIXES, collectSensitiveValues } from './env.js';

const MIN_SECRET_LENGTH = 4;
const REDACTED = '[REDACTED]';

/**
 * Known-values stream redactor.
 *
 * Collects actual secret values at session start, then performs exact string
 * replacement on PTY output before it reaches the WebSocket. No regex on the
 * output stream — avoids mangling ANSI escape sequences.
 *
 * Maintains an overlap buffer to catch secrets that straddle two PTY chunks.
 */
export class StreamRedactor {
  private secrets: string[] = [];
  private maxLen = 0;
  private overlap = '';

  /** Add a single secret value. Values ≤ 3 chars are ignored. */
  addSecret(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length < MIN_SECRET_LENGTH) return;
    if (this.secrets.includes(trimmed)) return;
    this.secrets.push(trimmed);
    if (trimmed.length > this.maxLen) this.maxLen = trimmed.length;
  }

  /** Collect values of env vars matching SENSITIVE_ENV_PREFIXES. */
  collectFromEnv(env: Record<string, string | undefined>): void {
    for (const val of collectSensitiveValues(env)) {
      this.addSecret(val);
    }
  }

  /**
   * Parse a .env file and add all values as secrets.
   * Supports KEY=value, KEY="value", KEY='value', and # comments.
   */
  collectFromFile(filePath: string): void {
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      return; // file not found or unreadable — silently skip
    }
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      this.addSecret(val);
    }
  }

  /** Returns true if at least one secret is registered. */
  get hasSecrets(): boolean {
    return this.secrets.length > 0;
  }

  /**
   * Replace known secret values with [REDACTED] in `data`.
   *
   * Uses an overlap buffer to handle secrets split across consecutive chunks.
   * The caller must feed chunks in order — each call returns the safe portion
   * of the previous overlap + current data.
   */
  redact(data: string): string {
    if (this.secrets.length === 0) return data;

    // Combine overlap from previous chunk with current data
    const combined = this.overlap + data;
    const holdBack = this.maxLen - 1;

    // Redact the full combined string so secrets spanning the boundary are caught
    let redacted = combined;
    for (const secret of this.secrets) {
      redacted = redacted.replaceAll(secret, REDACTED);
    }

    // Hold back maxLen-1 chars of the redacted result for the next chunk.
    // The held-back portion may contain the start of a secret that continues
    // in the next chunk. Re-redacting on the next call is a no-op for already
    // replaced text but catches newly completed secrets.
    if (holdBack > 0 && redacted.length > holdBack) {
      this.overlap = redacted.slice(redacted.length - holdBack);
      return redacted.slice(0, redacted.length - holdBack);
    }

    if (holdBack > 0) {
      this.overlap = redacted;
      return '';
    }

    this.overlap = '';
    return redacted;
  }

  /** Flush any remaining overlap buffer (call at end of stream). */
  flush(): string {
    if (!this.overlap) return '';
    let result = this.overlap;
    for (const secret of this.secrets) {
      result = result.replaceAll(secret, REDACTED);
    }
    this.overlap = '';
    return result;
  }
}
