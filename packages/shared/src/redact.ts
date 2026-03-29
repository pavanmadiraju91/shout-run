const MIN_SECRET_LENGTH = 4;
const REDACTED = '[REDACTED]';

/**
 * Known-values stream redactor.
 *
 * Collects actual secret values, then performs exact string replacement
 * on output data. No regex on the output stream — avoids mangling
 * ANSI escape sequences.
 *
 * Maintains an overlap buffer to catch secrets that straddle two chunks.
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

    const combined = this.overlap + data;
    const holdBack = this.maxLen - 1;

    // Redact the full combined string so secrets spanning the boundary are caught
    let redacted = combined;
    for (const secret of this.secrets) {
      redacted = redacted.replaceAll(secret, REDACTED);
    }

    // Hold back maxLen-1 chars of the redacted result for the next chunk
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
