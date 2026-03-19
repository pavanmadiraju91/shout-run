import { describe, it, expect } from 'vitest';
import {
  sanitizeTitle,
  sanitizeDescription,
  sanitizeTags,
  validateVisibility,
} from '../validation.js';

describe('validation', () => {
  describe('sanitizeTitle', () => {
    it('strips control chars', () => {
      const result = sanitizeTitle('Hello\x00World\x1fTest\x7f');
      expect(result).toBe('HelloWorldTest');
    });

    it('clamps to 256 by default', () => {
      const longTitle = 'a'.repeat(300);
      const result = sanitizeTitle(longTitle);
      expect(result.length).toBe(256);
    });

    it('respects custom maxLength', () => {
      const longTitle = 'a'.repeat(100);
      const result = sanitizeTitle(longTitle, 50);
      expect(result.length).toBe(50);
    });
  });

  describe('sanitizeDescription', () => {
    it('returns null for empty after stripping', () => {
      const result = sanitizeDescription('\x00\x1f\x7f');
      expect(result).toBeNull();
    });

    it('clamps to 500 by default', () => {
      const longDesc = 'b'.repeat(600);
      const result = sanitizeDescription(longDesc);
      expect(result?.length).toBe(500);
    });

    it('strips control chars', () => {
      const result = sanitizeDescription('Test\x00Description\x1f');
      expect(result).toBe('TestDescription');
    });
  });

  describe('sanitizeTags', () => {
    it('limits to 5 tags by default', () => {
      const tags = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'];
      const result = sanitizeTags(tags);
      expect(result.length).toBe(5);
      expect(result).toEqual(['one', 'two', 'three', 'four', 'five']);
    });

    it('clamps each tag to 32 chars by default', () => {
      const tags = ['a'.repeat(50), 'short'];
      const result = sanitizeTags(tags);
      expect(result[0].length).toBe(32);
      expect(result[1]).toBe('short');
    });
  });

  describe('validateVisibility', () => {
    it('defaults to "public" when undefined', () => {
      const result = validateVisibility(undefined);
      expect(result).toBe('public');
    });

    it('returns null for invalid value', () => {
      const result = validateVisibility('invalid');
      expect(result).toBeNull();
    });

    it('accepts "public"', () => {
      expect(validateVisibility('public')).toBe('public');
    });

    it('accepts "followers"', () => {
      expect(validateVisibility('followers')).toBe('followers');
    });

    it('accepts "private"', () => {
      expect(validateVisibility('private')).toBe('private');
    });
  });
});
