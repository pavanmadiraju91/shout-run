import type { Session, SessionSummary } from '@shout/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface SessionWithUser extends Session {
  username: string;
  avatarUrl: string;
}

function getAuthHeaders(): HeadersInit {
  if (typeof window === 'undefined') return {};

  const token = localStorage.getItem('shout_token');
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
  };
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
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

export async function fetchCurrentUser(): Promise<Session | null> {
  try {
    const response = await fetchApi<{ data: Session }>('/api/auth/me');
    return response.data;
  } catch {
    return null;
  }
}
