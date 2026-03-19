import { describe, it, expect } from 'vitest';
import { formatDuration, formatBytes } from '../format.js';

describe('formatDuration', () => {
  it('returns "0s" for 0 milliseconds', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('returns "0s" for 999 milliseconds', () => {
    expect(formatDuration(999)).toBe('0s');
  });

  it('returns "1s" for 1000 milliseconds', () => {
    expect(formatDuration(1000)).toBe('1s');
  });

  it('returns "59s" for 59000 milliseconds', () => {
    expect(formatDuration(59000)).toBe('59s');
  });

  it('returns "1m 0s" for 60000 milliseconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
  });

  it('returns "1m 1s" for 61000 milliseconds', () => {
    expect(formatDuration(61000)).toBe('1m 1s');
  });

  it('returns "1h 0m 0s" for 3600000 milliseconds', () => {
    expect(formatDuration(3600000)).toBe('1h 0m 0s');
  });

  it('returns "1h 1m 1s" for 3661000 milliseconds', () => {
    expect(formatDuration(3661000)).toBe('1h 1m 1s');
  });

  it('returns "24h 0m 0s" for 86400000 milliseconds', () => {
    expect(formatDuration(86400000)).toBe('24h 0m 0s');
  });
});

describe('formatBytes', () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('returns "1 B" for 1 byte', () => {
    expect(formatBytes(1)).toBe('1 B');
  });

  it('returns "1023 B" for 1023 bytes', () => {
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('returns "1.0 KB" for 1024 bytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
  });

  it('returns "1.5 KB" for 1536 bytes', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('returns "1.0 MB" for 1048576 bytes', () => {
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });

  it('returns "1.5 MB" for 1572864 bytes', () => {
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });
});
