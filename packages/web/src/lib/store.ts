import { create } from 'zustand';
import {
  fetchLiveSessions as apiGetLiveSessions,
  fetchRecentSessions as apiGetRecentSessions,
  fetchSession as apiGetSession,
  fetchCurrentUser as apiGetCurrentUser,
} from './api';
import type { RecentSession } from './api';
import type { Session, SessionSummary, User } from '@shout/shared';

interface SessionWithUser extends Session {
  username: string;
  avatarUrl: string;
}

interface StoreState {
  liveSessions: SessionSummary[];
  recentSessions: RecentSession[];
  currentSession: SessionWithUser | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  fetchLiveSessions: () => Promise<void>;
  fetchRecentSessions: () => Promise<void>;
  fetchSession: (id: string) => Promise<SessionWithUser | null>;
  hydrateUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearError: () => void;
}

export const useStore = create<StoreState>((set, get) => ({
  liveSessions: [],
  recentSessions: [],
  currentSession: null,
  user: null,
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

  fetchSession: async (id: string) => {
    const { currentSession } = get();

    // Return cached if same session
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

  hydrateUser: async () => {
    const data = await apiGetCurrentUser();
    if (data) {
      set({
        user: {
          id: data.id,
          githubId: 0,
          username: data.username,
          avatarUrl: data.avatarUrl,
          createdAt: '',
        },
      });
    }
  },

  setUser: (user) => {
    set({ user });
  },

  clearError: () => {
    set({ error: null });
  },
}));
