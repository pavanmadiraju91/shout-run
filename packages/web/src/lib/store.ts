import { create } from 'zustand';
import {
  fetchLiveSessions as apiGetLiveSessions,
  fetchRecentSessions as apiGetRecentSessions,
  fetchSession as apiGetSession,
} from './api';
import type { RecentSession } from './api';
import type { Session, SessionSummary } from '@shout/shared';

interface SessionWithUser extends Session {
  username: string;
  avatarUrl: string;
}

export interface FeedItem {
  id: string;
  username: string;
  avatarUrl: string;
  title: string;
  description?: string;
  viewerCount: number;
  upvotes: number;
  startedAt: string;
  endedAt?: string;
  isLive: boolean;
}

interface StoreState {
  liveSessions: SessionSummary[];
  recentSessions: RecentSession[];
  feedItems: FeedItem[];
  currentSession: SessionWithUser | null;
  isLoading: boolean;
  error: string | null;

  fetchLiveSessions: () => Promise<void>;
  fetchRecentSessions: () => Promise<void>;
  fetchFeed: () => Promise<void>;
  fetchSession: (id: string) => Promise<SessionWithUser | null>;
  updateUpvotes: (sessionId: string, count: number) => void;
  clearError: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  liveSessions: [],
  recentSessions: [],
  feedItems: [],
  currentSession: null,
  isLoading: false,
  error: null,

  fetchLiveSessions: async () => {
    try {
      const sessions = await apiGetLiveSessions();
      set({ liveSessions: sessions });
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
      set({ error: 'Failed to fetch live sessions' });
    }
  },

  fetchRecentSessions: async () => {
    try {
      const sessions = await apiGetRecentSessions();
      set({ recentSessions: sessions });
    } catch (error) {
      console.error('Failed to fetch recent sessions:', error);
      set({ error: 'Failed to fetch recent sessions' });
    }
  },

  fetchFeed: async () => {
    try {
      const [live, recent] = await Promise.all([apiGetLiveSessions(), apiGetRecentSessions()]);

      const liveItems: FeedItem[] = live.map((s) => ({
        id: s.id,
        username: s.username,
        avatarUrl: s.avatarUrl,
        title: s.title,
        description: s.description,
        viewerCount: s.viewerCount,
        upvotes: s.upvotes,
        startedAt: s.startedAt,
        isLive: true,
      }));

      const recentItems: FeedItem[] = recent.map((s) => ({
        id: s.id,
        username: s.username,
        avatarUrl: s.avatarUrl,
        title: s.title,
        description: s.description,
        viewerCount: s.viewerCount,
        upvotes: s.upvotes,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        isLive: false,
      }));

      set({
        liveSessions: live,
        recentSessions: recent,
        feedItems: [...liveItems, ...recentItems],
      });
    } catch (error) {
      console.error('Failed to fetch feed:', error);
      set({ error: 'Failed to fetch feed' });
    }
  },

  fetchSession: async (id: string) => {
    const { currentSession } = get();

    if (currentSession?.id === id) {
      return currentSession;
    }

    set({ isLoading: true, error: null });

    try {
      const session = await apiGetSession(id);
      set({ currentSession: session, isLoading: false });
      return session;
    } catch (error) {
      console.error('Failed to fetch session:', error);
      set({ error: 'Failed to fetch session', isLoading: false });
      return null;
    }
  },

  updateUpvotes: (sessionId: string, count: number) => {
    set((state) => ({
      feedItems: state.feedItems.map((item) =>
        item.id === sessionId ? { ...item, upvotes: count } : item,
      ),
    }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
