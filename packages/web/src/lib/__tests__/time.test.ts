import { describe, it, expect } from 'vitest';
import { formatDuration } from '../time';

describe('formatDuration', () => {
  it('formats 0ms as "0:00"', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('formats 1000ms as "0:01"', () => {
    expect(formatDuration(1000)).toBe('0:01');
  });

  it('formats 59000ms as "0:59"', () => {
    expect(formatDuration(59000)).toBe('0:59');
  });

  it('formats 60000ms as "1:00"', () => {
    expect(formatDuration(60000)).toBe('1:00');
  });

  it('formats 61000ms as "1:01"', () => {
    expect(formatDuration(61000)).toBe('1:01');
  });

  it('formats 3600000ms as "1:00:00"', () => {
    expect(formatDuration(3600000)).toBe('1:00:00');
  });

  it('formats 3661000ms as "1:01:01"', () => {
    expect(formatDuration(3661000)).toBe('1:01:01');
  });

  it('formats 500ms as "0:00" (rounds down)', () => {
    expect(formatDuration(500)).toBe('0:00');
  });
});
