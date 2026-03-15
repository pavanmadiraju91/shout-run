'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { fetchSession } from '@/lib/api';
import { formatDuration } from '@/lib/time';
import { LiveBadge } from '@/components/LiveBadge';
import { useReplayController } from '@/hooks/useReplayController';
import type { Session } from '@shout/shared';
import type { Terminal as XTerm } from '@xterm/xterm';

const Terminal = dynamic(() => import('@/components/Terminal').then((mod) => mod.Terminal), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-shout-bg flex items-center justify-center">
      <div className="text-shout-muted">Loading terminal...</div>
    </div>
  ),
});

const PlayerBar = dynamic(() => import('@/components/PlayerBar').then((mod) => mod.PlayerBar), {
  ssr: false,
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

  // xterm ref for replay controller
  const [xtermInstance, setXtermInstance] = useState<XTerm | null>(null);

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

  // Live duration timer
  useEffect(() => {
    if (!startTime || session?.status !== 'live') return;

    const updateDuration = () => {
      const diff = Date.now() - startTime.getTime();
      setDuration(formatDuration(diff));
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startTime, session?.status]);

  const handleViewerCountChange = useCallback((count: number) => {
    setViewerCount(count);
  }, []);

  const handleTerminalReady = useCallback((xterm: XTerm) => {
    setXtermInstance(xterm);
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
    }
  }, [username, sessionId, session?.title]);

  const isLive = session?.status === 'live';

  // Replay controller (only active for ended sessions when xterm is ready)
  const replay = useReplayController(
    !isLive ? sessionId : '',
    !isLive ? xtermInstance : null,
  );

  // Compute session total duration for ended sessions
  const sessionDurationText = session && !isLive && session.startedAt && session.endedAt
    ? formatDuration(new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime())
    : null;

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
        <svg
          className="w-14 h-14 text-shout-muted mb-4"
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
        <h1 className="text-xl font-medium mb-2">Session not found</h1>
        <p className="text-shout-muted mb-6 text-sm">
          This session may have been deleted or never existed.
        </p>
        <Link
          href="/"
          className="text-shout-accent hover:underline text-sm"
        >
          Back to live sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Session Header — 3-column grid */}
      <div className="bg-shout-surface border-b border-shout-border px-4 py-3">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-3">
          {/* Left: Avatar */}
          <Link href={`/${username}`} className="flex-shrink-0 hover:opacity-80 self-start mt-0.5">
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
          </Link>

          {/* Center: Username + badge + title */}
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2">
              <Link href={`/${username}`} className="font-medium hover:text-shout-accent transition-colors">
                {username}
              </Link>
              {isLive ? (
                <LiveBadge size="small" />
              ) : (
                <span className="text-xs bg-shout-muted/20 text-shout-muted px-2 py-0.5 rounded">
                  Ended
                </span>
              )}
            </div>
            <div className="text-sm text-shout-muted truncate">
              {session.title || 'Untitled Session'}
            </div>
          </div>

          {/* Right: Metadata + actions */}
          <div className="flex items-center gap-4 text-sm flex-shrink-0">
            {/* Viewer count (live) */}
            {isLive && (
              <div className="flex items-center gap-1.5 text-shout-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="tabular-nums">{viewerCount.toLocaleString()}</span>
              </div>
            )}

            {/* Duration */}
            <div className="flex items-center gap-1.5 text-shout-muted">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-mono tabular-nums">
                {isLive ? duration : sessionDurationText ?? '--:--'}
              </span>
            </div>

            {/* Separator + actions */}
            <div className="border-l border-shout-border pl-4 flex items-center gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-shout-muted hover:text-shout-text transition-colors p-1.5 rounded hover:bg-shout-surface-hover"
                title="Share session"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <span className="hidden sm:inline text-xs">Share</span>
              </button>

              {!isLive && (
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/sessions/${sessionId}/export`}
                  download
                  className="flex items-center gap-1.5 text-shout-muted hover:text-shout-text transition-colors p-1.5 rounded hover:bg-shout-surface-hover"
                  title="Export as .cast file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span className="hidden sm:inline text-xs">Export</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Terminal */}
      <Terminal
        sessionId={sessionId}
        isLive={isLive}
        sessionTitle={session.title || undefined}
        onViewerCountChange={handleViewerCountChange}
        replayMode={!isLive}
        onTerminalReady={handleTerminalReady}
      />

      {/* Player bar at bottom (ended sessions only) */}
      {!isLive && !replay.isLoading && replay.totalDuration > 0 && (
        <PlayerBar
          isPlaying={replay.isPlaying}
          currentTime={replay.currentTime}
          totalDuration={replay.totalDuration}
          playbackSpeed={replay.playbackSpeed}
          onPlay={replay.play}
          onPause={replay.pause}
          onSeek={replay.seek}
          onSpeedChange={replay.setSpeed}
        />
      )}
    </div>
  );
}
