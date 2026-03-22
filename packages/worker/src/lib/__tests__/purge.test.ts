import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for purgeDeletedSessions.
 *
 * We test the core logic by mocking Turso (drizzle), R2, and DO stubs.
 * The purge function should:
 *   1. Skip sessions deleted less than 7 days ago
 *   2. Purge sessions deleted >= 7 days ago (DO cleanup, R2 delete, Turso hard-delete)
 *   3. Continue processing if one session fails
 */

// ── Mocks ────────────────────────────────────────────────────────

// Track calls to verify behavior
const mockDbSelect = vi.fn();
const mockDbDelete = vi.fn();
const mockDoFetch = vi.fn();
const mockR2List = vi.fn();
const mockR2Delete = vi.fn();

// Chainable select mock
const selectChain = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn(() => mockDbSelect()),
};

// Chainable delete mock
const deleteChain = {
  where: vi.fn(() => mockDbDelete()),
};

const mockDb = {
  select: vi.fn(() => selectChain),
  delete: vi.fn(() => deleteChain),
};

vi.mock('../db.js', () => ({
  createDb: vi.fn(() => mockDb),
  sessions: {
    id: 'id',
    status: 'status',
    deletedAt: 'deleted_at',
  },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: 'eq', args })),
  and: vi.fn((...args: unknown[]) => ({ type: 'and', args })),
  lt: vi.fn((...args: unknown[]) => ({ type: 'lt', args })),
}));

// ── Helpers ──────────────────────────────────────────────────────

function makeEnv(overrides: Partial<MockEnv> = {}): MockEnv {
  return {
    TURSO_URL: 'libsql://test.turso.io',
    TURSO_AUTH_TOKEN: 'test-token',
    SESSION_HUB: {
      idFromName: vi.fn((name: string) => ({ name })),
      get: vi.fn(() => ({ fetch: mockDoFetch })),
    },
    SESSIONS_BUCKET: {
      list: mockR2List,
      delete: mockR2Delete,
    },
    ...overrides,
  } as unknown as MockEnv;
}

type MockEnv = import('../../env.js').Env;

// ── Tests ────────────────────────────────────────────────────────

describe('purgeDeletedSessions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Reset chainable mocks
    selectChain.from.mockReturnThis();
    selectChain.where.mockReturnThis();
    selectChain.limit.mockImplementation(() => mockDbSelect());
    deleteChain.where.mockImplementation(() => mockDbDelete());
    mockDb.select.mockReturnValue(selectChain);
    mockDb.delete.mockReturnValue(deleteChain);
  });

  it('does nothing when no sessions are eligible for purge', async () => {
    mockDbSelect.mockResolvedValue([]);

    const { purgeDeletedSessions } = await import('../purge.js');
    await purgeDeletedSessions(makeEnv());

    expect(mockDoFetch).not.toHaveBeenCalled();
    expect(mockR2List).not.toHaveBeenCalled();
    expect(mockDbDelete).not.toHaveBeenCalled();
  });

  it('purges eligible sessions: calls DO cleanup, R2 delete, and Turso hard-delete', async () => {
    mockDbSelect.mockResolvedValue([{ id: 'sess-old-1' }, { id: 'sess-old-2' }]);
    mockDoFetch.mockResolvedValue(new Response('OK'));
    mockR2List.mockResolvedValue({ objects: [{ key: 'sessions/sess-old-1/replay.json' }] });
    mockR2Delete.mockResolvedValue(undefined);
    mockDbDelete.mockResolvedValue(undefined);

    const { purgeDeletedSessions } = await import('../purge.js');
    await purgeDeletedSessions(makeEnv());

    // DO cleanup called for each session
    expect(mockDoFetch).toHaveBeenCalledTimes(2);
    expect(mockDoFetch).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'DELETE' }),
    );

    // R2 list + delete called for each session
    expect(mockR2List).toHaveBeenCalledTimes(2);

    // Turso hard-delete called for each session
    expect(mockDb.delete).toHaveBeenCalledTimes(2);
  });

  it('continues processing when one session fails', async () => {
    mockDbSelect.mockResolvedValue([{ id: 'sess-fail' }, { id: 'sess-ok' }]);

    // First session: DO cleanup throws
    mockDoFetch
      .mockRejectedValueOnce(new Error('DO unavailable'))
      .mockResolvedValueOnce(new Response('OK'));

    mockR2List.mockResolvedValue({ objects: [] });
    mockDbDelete.mockResolvedValue(undefined);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { purgeDeletedSessions } = await import('../purge.js');
    await purgeDeletedSessions(makeEnv());

    // First session failed, but second session still processed
    expect(mockDoFetch).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to purge session sess-fail'),
      expect.any(Error),
    );

    // Second session completed successfully
    expect(mockR2List).toHaveBeenCalledTimes(1);
    expect(mockDb.delete).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('skips R2 delete when no objects exist under the session prefix', async () => {
    mockDbSelect.mockResolvedValue([{ id: 'sess-no-r2' }]);
    mockDoFetch.mockResolvedValue(new Response('OK'));
    mockR2List.mockResolvedValue({ objects: [] });
    mockDbDelete.mockResolvedValue(undefined);

    const { purgeDeletedSessions } = await import('../purge.js');
    await purgeDeletedSessions(makeEnv());

    expect(mockR2List).toHaveBeenCalledTimes(1);
    // R2 delete should NOT be called when objects list is empty
    expect(mockR2Delete).not.toHaveBeenCalled();
    // Hard-delete from Turso still happens
    expect(mockDb.delete).toHaveBeenCalledTimes(1);
  });
});
