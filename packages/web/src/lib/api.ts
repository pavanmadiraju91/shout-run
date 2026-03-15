import type { Session, SessionSummary } from '@shout/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface SessionWithUser extends Session {
  username: string;
  avatarUrl: string;
}

export interface RecentSession {
  id: string;
  title: string;
  description?: string;
  viewerCount: number;
  upvotes: number;
  startedAt: string;
  endedAt?: string;
  username: string;
  avatarUrl: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchLiveSessions(): Promise<SessionSummary[]> {
  try {
    const response = await fetchApi<{ data: SessionSummary[] }>('/api/sessions/live');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch live sessions:', error);
    return [];
  }
}

export async function fetchRecentSessions(): Promise<RecentSession[]> {
  try {
    const response = await fetchApi<{ data: RecentSession[] }>('/api/sessions/recent');
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch recent sessions:', error);
    return [];
  }
}

export async function fetchSession(id: string): Promise<SessionWithUser> {
  const response = await fetchApi<{ data: SessionWithUser }>(`/api/sessions/${id}`);
  return response.data;
}

export async function fetchUserSessions(username: string): Promise<SessionWithUser[]> {
  try {
    const response = await fetchApi<{ data: SessionWithUser[] }>(
      `/api/users/${username}/sessions`
    );
    return response.data || [];
  } catch (error) {
    console.error('Failed to fetch user sessions:', error);
    return [];
  }
}

// ── Anonymous Voter Identity ─────────────────────────────────

const VOTER_ID_KEY = 'shout_voter_id';
const VOTED_PREFIX = 'shout_voted_';

export function getVoterId(): string {
  if (typeof window === 'undefined') return '';

  let id = localStorage.getItem(VOTER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VOTER_ID_KEY, id);
  }
  return id;
}

export function hasVoted(sessionId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`${VOTED_PREFIX}${sessionId}`) === '1';
}

export function markVoted(sessionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${VOTED_PREFIX}${sessionId}`, '1');
}

export async function upvoteSession(
  sessionId: string,
  voterId: string,
): Promise<{ upvotes: number } | null> {
  try {
    const response = await fetchApi<{ data: { upvotes: number } }>(
      `/api/sessions/${sessionId}/upvote`,
      {
        method: 'POST',
        body: JSON.stringify({ voterId }),
      },
    );
    return response.data;
  } catch {
    return null;
  }
}
