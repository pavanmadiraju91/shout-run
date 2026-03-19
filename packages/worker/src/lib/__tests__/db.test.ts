import { describe, it, expect, vi } from 'vitest';

vi.mock('drizzle-orm/libsql', () => ({ drizzle: vi.fn() }));
vi.mock('@libsql/client', () => ({ createClient: vi.fn() }));
vi.mock('drizzle-orm/sqlite-core', () => {
  const chain = () => new Proxy({}, { get: () => chain });
  return {
    sqliteTable: () => ({}),
    text: chain,
    integer: chain,
  };
});

import { generateId } from '../db.js';

describe('db', () => {
  describe('generateId', () => {
    it('returns 12-char string', () => {
      const id = generateId();
      expect(id.length).toBe(12);
    });

    it('lowercase alphanumeric only: /^[0-9a-z]{12}$/', () => {
      const id = generateId();
      expect(id).toMatch(/^[0-9a-z]{12}$/);
    });

    it('two calls produce different IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });
});
