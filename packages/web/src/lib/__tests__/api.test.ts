import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchLiveSessions,
  fetchRecentSessions,
  fetchSession,
  getVoterId,
  hasVoted,
  markVoted,
  upvoteSession,
} from '../api';

vi.mock('@shout/shared', () => ({}));

describe('api', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  describe('fetchLiveSessions', () => {
    it('calls /api/sessions/live', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await fetchLiveSessions();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sessions/live',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('returns data array', async () => {
      const mockData = [{ id: '1', title: 'Test' }];
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: mockData }),
      }));

      const result = await fetchLiveSessions();

      expect(result).toEqual(mockData);
    });

    it('returns empty array on error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await fetchLiveSessions();

      expect(result).toEqual([]);
    });
  });

  describe('fetchRecentSessions', () => {
    it('calls /api/sessions/recent', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await fetchRecentSessions();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sessions/recent',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  describe('fetchSession', () => {
    it('calls /api/sessions/{id}', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'test-id' } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await fetchSession('test-id');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sessions/test-id',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('throws on error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      }));

      await expect(fetchSession('non-existent')).rejects.toThrow('Not found');
    });
  });

  describe('getVoterId', () => {
    it('creates and stores new ID', () => {
      const id = getVoterId();

      expect(id).toBeTruthy();
      expect(localStorage.getItem('shout_voter_id')).toBe(id);
    });

    it('returns existing ID', () => {
      localStorage.setItem('shout_voter_id', 'existing-id');

      const id = getVoterId();

      expect(id).toBe('existing-id');
    });
  });

  describe('hasVoted', () => {
    it('returns false when not voted', () => {
      expect(hasVoted('session-1')).toBe(false);
    });

    it('returns true after markVoted', () => {
      markVoted('session-1');

      expect(hasVoted('session-1')).toBe(true);
    });
  });

  describe('markVoted', () => {
    it('stores in localStorage', () => {
      markVoted('session-123');

      expect(localStorage.getItem('shout_voted_session-123')).toBe('1');
    });
  });

  describe('upvoteSession', () => {
    it('sends POST with voterId', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { upvotes: 5 } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await upvoteSession('session-1', 'voter-123');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sessions/session-1/upvote',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ voterId: 'voter-123' }),
        })
      );
      expect(result).toEqual({ upvotes: 5 });
    });

    it('returns null on error', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

      const result = await upvoteSession('session-1', 'voter-123');

      expect(result).toBeNull();
    });
  });
});
