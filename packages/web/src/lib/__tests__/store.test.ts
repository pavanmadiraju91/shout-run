import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api', () => ({
  fetchLiveSessions: vi.fn(),
  fetchRecentSessions: vi.fn(),
  fetchSession: vi.fn(),
}));

vi.mock('@shout/shared', () => ({}));

import { useStore } from '../store';
import { fetchLiveSessions, fetchRecentSessions, fetchSession } from '../api';

describe('store', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useStore.setState({
      liveSessions: [],
      recentSessions: [],
      feedItems: [],
      currentSession: null,
      isLoading: false,
      error: null,
    });
  });

  it('has empty arrays and null values in initial state', () => {
    const state = useStore.getState();

    expect(state.liveSessions).toEqual([]);
    expect(state.recentSessions).toEqual([]);
    expect(state.feedItems).toEqual([]);
    expect(state.currentSession).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchFeed populates feedItems from live and recent', async () => {
    const mockLive = [{ id: 'live-1', username: 'user1', avatarUrl: 'url1', title: 'Live', viewerCount: 5, upvotes: 10, startedAt: '2024-01-01' }];
    const mockRecent = [{ id: 'recent-1', username: 'user2', avatarUrl: 'url2', title: 'Recent', viewerCount: 3, upvotes: 7, startedAt: '2024-01-01', endedAt: '2024-01-02' }];

    vi.mocked(fetchLiveSessions).mockResolvedValue(mockLive);
    vi.mocked(fetchRecentSessions).mockResolvedValue(mockRecent);

    await useStore.getState().fetchFeed();

    const state = useStore.getState();
    expect(state.feedItems).toHaveLength(2);
    expect(state.feedItems[0].isLive).toBe(true);
    expect(state.feedItems[1].isLive).toBe(false);
  });

  it('fetchFeed sets error on failure', async () => {
    vi.mocked(fetchLiveSessions).mockRejectedValue(new Error('Network error'));

    await useStore.getState().fetchFeed();

    expect(useStore.getState().error).toBe('Failed to fetch feed');
  });

  it('updateUpvotes updates correct item', () => {
    useStore.setState({
      feedItems: [
        { id: 'item-1', username: 'u1', avatarUrl: '', title: 't1', viewerCount: 0, upvotes: 5, startedAt: '', isLive: true },
        { id: 'item-2', username: 'u2', avatarUrl: '', title: 't2', viewerCount: 0, upvotes: 3, startedAt: '', isLive: false },
      ],
    });

    useStore.getState().updateUpvotes('item-1', 10);

    const state = useStore.getState();
    expect(state.feedItems[0].upvotes).toBe(10);
    expect(state.feedItems[1].upvotes).toBe(3);
  });

  it('updateUpvotes is no-op for non-existent ID', () => {
    useStore.setState({
      feedItems: [
        { id: 'item-1', username: 'u1', avatarUrl: '', title: 't1', viewerCount: 0, upvotes: 5, startedAt: '', isLive: true },
      ],
    });

    useStore.getState().updateUpvotes('non-existent', 100);

    expect(useStore.getState().feedItems[0].upvotes).toBe(5);
  });

  it('clearError resets error to null', () => {
    useStore.setState({ error: 'Some error' });

    useStore.getState().clearError();

    expect(useStore.getState().error).toBeNull();
  });

  it('fetchSession returns cached session if ID matches', async () => {
    const cachedSession = { id: 'cached-id', username: 'user', avatarUrl: '', title: 'Cached' } as any;
    useStore.setState({ currentSession: cachedSession });

    const result = await useStore.getState().fetchSession('cached-id');

    expect(fetchSession).not.toHaveBeenCalled();
    expect(result).toBe(cachedSession);
  });

  it('fetchSession sets isLoading during fetch', async () => {
    const mockSession = { id: 'new-id', username: 'user', avatarUrl: '' };
    vi.mocked(fetchSession).mockResolvedValue(mockSession as any);

    const fetchPromise = useStore.getState().fetchSession('new-id');

    // isLoading should be true while fetching
    expect(useStore.getState().isLoading).toBe(true);

    await fetchPromise;

    expect(useStore.getState().isLoading).toBe(false);
    expect(useStore.getState().currentSession).toEqual(mockSession);
  });
});
