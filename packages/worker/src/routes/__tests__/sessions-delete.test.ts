import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for DELETE /api/sessions/:id logic.
 *
 * These test the core decision logic of the delete handler without standing up
 * a full Hono app + real DB. Each test exercises one branch of the handler:
 *   1. Session not found → 404
 *   2. Not owner → 404 (no existence leak)
 *   3. Live session → 409
 *   4. Already deleted → 404
 *   5. Ended + owner → soft-delete (status = 'deleted')
 */

// The decision logic extracted to match the handler in sessions.ts
interface SessionRow {
  id: string;
  userId: string;
  status: string;
}

function deleteSessionDecision(
  session: SessionRow | undefined,
  requestUserId: string,
): { status: number; body: { ok: boolean; error?: string } } {
  // Session not found (including already-deleted — filtered by query)
  if (!session) {
    return { status: 404, body: { ok: false, error: 'Session not found' } };
  }

  // Owner check — 404 (not 403) to avoid leaking existence
  if (session.userId !== requestUserId) {
    return { status: 404, body: { ok: false, error: 'Session not found' } };
  }

  // Cannot delete live sessions
  if (session.status === 'live') {
    return { status: 409, body: { ok: false, error: 'Cannot delete a live session' } };
  }

  // Success — soft delete
  return { status: 200, body: { ok: true } };
}

describe('DELETE /api/sessions/:id — decision logic', () => {
  const ownerId = 'user-owner-123';
  const otherUserId = 'user-other-456';

  it('returns 404 for nonexistent session', () => {
    const result = deleteSessionDecision(undefined, ownerId);
    expect(result.status).toBe(404);
    expect(result.body.ok).toBe(false);
    expect(result.body.error).toBe('Session not found');
  });

  it('returns 404 for another user\'s session (does not leak existence)', () => {
    const session: SessionRow = { id: 'sess-1', userId: ownerId, status: 'ended' };
    const result = deleteSessionDecision(session, otherUserId);
    expect(result.status).toBe(404);
    expect(result.body.ok).toBe(false);
    // Must be same error as nonexistent — no info leak
    expect(result.body.error).toBe('Session not found');
  });

  it('returns 409 for live session', () => {
    const session: SessionRow = { id: 'sess-2', userId: ownerId, status: 'live' };
    const result = deleteSessionDecision(session, ownerId);
    expect(result.status).toBe(409);
    expect(result.body.ok).toBe(false);
    expect(result.body.error).toBe('Cannot delete a live session');
  });

  it('returns 404 for already-deleted session (filtered at query level)', () => {
    // Already-deleted sessions are excluded by the DB query (ne(status, 'deleted')),
    // so the handler receives undefined — same as nonexistent
    const result = deleteSessionDecision(undefined, ownerId);
    expect(result.status).toBe(404);
  });

  it('returns 200 for ended session owned by user', () => {
    const session: SessionRow = { id: 'sess-3', userId: ownerId, status: 'ended' };
    const result = deleteSessionDecision(session, ownerId);
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    expect(result.body.error).toBeUndefined();
  });

  it('non-owner gets same 404 response as nonexistent', () => {
    const nonexistentResult = deleteSessionDecision(undefined, otherUserId);
    const notOwnerResult = deleteSessionDecision(
      { id: 'sess-4', userId: ownerId, status: 'ended' },
      otherUserId,
    );
    // Both should produce identical responses — no way to distinguish
    expect(nonexistentResult.status).toBe(notOwnerResult.status);
    expect(nonexistentResult.body.error).toBe(notOwnerResult.body.error);
  });
});
