'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import dynamic from 'next/dynamic';
import { fetchSession } from '@/lib/api';
import { LiveBadge } from '@/components/LiveBadge';
import { ViewerCount } from '@/components/ViewerCount';
import type { Session } from '@shout/shared';

const Terminal = dynamic(() => import('@/components/Terminal').then((mod) => mod.Terminal), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-shout-bg flex items-center justify-center">
      <div className="text-shout-muted">Loading terminal...</div>
    </div>
  ),
});

interface SessionWithUser extends Session {
  username: string;
  avatarUrl: string;
}

export default function SessionViewerPage() {
  const params = useParams();
  const username = params.username as string;
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<SessionWithUser | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState('0:00');

  useEffect(() => {
    async function loadSession() {
      try {
        const data = await fetchSession(sessionId);
        setSession(data);
        setViewerCount(data.viewerCount);
        setStartTime(new Date(data.startedAt));
      } catch (err) {
        setError('Session not found');
        console.error('Failed to fetch session:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  // Update duration timer
  useEffect(() => {
    if (!startTime || session?.status !== 'live') return;

    const updateDuration = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      if (hours > 0) {
        setDuration(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setDuration(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime, session?.status]);

  const handleViewerCountChange = useCallback((count: number) => {
    setViewerCount(count);
  }, []);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/${username}/${sessionId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: session?.title || 'shout session',
          url,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(url);
      // Could add a toast notification here
    }
  }, [username, sessionId, session?.title]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)]">
        <div className="bg-shout-surface border-b border-shout-border px-4 py-3">
          <div className="animate-pulse flex items-center gap-3">
            <div className="w-10 h-10 bg-shout-border rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-shout-border rounded w-32 mb-2"></div>
              <div className="h-3 bg-shout-border rounded w-48"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-shout-bg"></div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)]">
        <div className="text-6xl mb-4">
          <svg
            className="w-16 h-16 text-shout-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-medium mb-2">Session not found</h1>
        <p className="text-shout-muted mb-6">
          This session may have been deleted or never existed.
        </p>
        <Link
          href="/"
          className="text-shout-accent hover:underline"
        >
          Back to live sessions
        </Link>
      </div>
    );
  }

  const isLive = session.status === 'live';

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Session Header */}
      <div className="bg-shout-surface border-b border-shout-border px-4 py-3">
        <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/${username}`} className="flex items-center gap-3 hover:opacity-80">
              {session.avatarUrl ? (
                <Image
                  src={session.avatarUrl}
                  alt={username}
                  width={40}
                  height={40}
                  className="rounded-full border border-shout-border"
                />
              ) : (
                <div className="w-10 h-10 bg-shout-bg rounded-full flex items-center justify-center font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{username}</span>
                  {isLive ? (
                    <LiveBadge />
                  ) : (
                    <span className="text-xs bg-shout-muted/20 text-shout-muted px-2 py-0.5 rounded">
                      Ended
                    </span>
                  )}
                </div>
                <div className="text-sm text-shout-muted">
                  {session.title || 'Untitled Session'}
                </div>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <ViewerCount count={viewerCount} />

            <div className="flex items-center gap-1.5 text-shout-muted">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-mono">
                {isLive
                  ? duration
                  : formatDistanceToNow(new Date(session.startedAt), { addSuffix: false })}
              </span>
            </div>

            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-shout-muted hover:text-shout-text transition-colors"
              title="Share session"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Terminal */}
      <Terminal
        sessionId={sessionId}
        isLive={isLive}
        onViewerCountChange={handleViewerCountChange}
      />
    </div>
  );
}
