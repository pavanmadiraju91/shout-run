'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { fetchUserSessions } from '@/lib/api';
import { LiveBadge } from '@/components/LiveBadge';
import { ViewerCount } from '@/components/ViewerCount';
import type { Session } from '@shout/shared';

interface UserSession extends Session {
  username: string;
  avatarUrl: string;
}

export default function UserProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'past'>('live');

  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await fetchUserSessions(username);
        setSessions(data);
      } catch (error) {
        console.error('Failed to fetch user sessions:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSessions();
  }, [username]);

  const liveSessions = sessions.filter((s) => s.status === 'live');
  const pastSessions = sessions.filter((s) => s.status === 'ended');
  const displayedSessions = activeTab === 'live' ? liveSessions : pastSessions;
  const userAvatar = sessions[0]?.avatarUrl;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-20 h-20 bg-shout-surface rounded-full"></div>
            <div>
              <div className="h-6 bg-shout-surface rounded w-32 mb-2"></div>
              <div className="h-4 bg-shout-surface rounded w-48"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Profile Header */}
      <div className="flex items-center gap-4 mb-8">
        {userAvatar ? (
          <Image
            src={userAvatar}
            alt={username}
            width={80}
            height={80}
            className="rounded-full border-2 border-shout-border"
          />
        ) : (
          <div className="w-20 h-20 bg-shout-surface rounded-full flex items-center justify-center text-2xl font-bold">
            {username.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{username}</h1>
          <p className="text-shout-muted">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-shout-border mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('live')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'live'
                ? 'border-shout-green text-shout-text'
                : 'border-transparent text-shout-muted hover:text-shout-text'
            }`}
          >
            Live Now
            {liveSessions.length > 0 && (
              <span className="ml-2 bg-shout-green text-black text-xs px-2 py-0.5 rounded-full">
                {liveSessions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'past'
                ? 'border-shout-accent text-shout-text'
                : 'border-transparent text-shout-muted hover:text-shout-text'
            }`}
          >
            Past Sessions
            <span className="ml-2 text-shout-muted">({pastSessions.length})</span>
          </button>
        </nav>
      </div>

      {/* Session List */}
      {displayedSessions.length > 0 ? (
        <div className="space-y-4">
          {displayedSessions.map((session) => (
            <Link
              key={session.id}
              href={`/${username}/${session.id}`}
              className="block bg-shout-surface border border-shout-border rounded-lg p-4 hover:border-shout-muted transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium">
                      {session.title || 'Untitled Session'}
                    </h3>
                    {session.status === 'live' && <LiveBadge size="small" />}
                  </div>
                  <p className="text-sm text-shout-muted">
                    {session.status === 'live'
                      ? `Started ${formatDistanceToNow(new Date(session.startedAt))} ago`
                      : format(new Date(session.startedAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm text-shout-muted">
                  <ViewerCount count={session.viewerCount} />
                  {session.endedAt && (
                    <span>
                      {formatDistanceToNow(new Date(session.startedAt), {
                        addSuffix: false,
                      })}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-shout-border border-dashed rounded-lg">
          <p className="text-shout-muted">
            {activeTab === 'live'
              ? 'Not broadcasting right now'
              : 'No past sessions'}
          </p>
        </div>
      )}
    </div>
  );
}
