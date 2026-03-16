'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { fetchSession } from '@/lib/api';
import { useReplayController } from '@/hooks/useReplayController';
import type { Session } from '@shout/shared';
import type { Terminal as XTerm } from '@xterm/xterm';

const Terminal = dynamic(() => import('@/components/Terminal').then((mod) => mod.Terminal), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-shout-bg flex items-center justify-center">
      <div className="text-shout-muted text-sm">Loading...</div>
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

export default function EmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;

  // Query params
  const autoplay = searchParams.get('autoplay') !== '0';
  const initialSpeed = parseFloat(searchParams.get('speed') || '1') || 1;
  const startTime = parseInt(searchParams.get('t') || '0', 10) || 0;
  const showControls = searchParams.get('controls') !== '0';

  const [session, setSession] = useState<SessionWithUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [xtermInstance, setXtermInstance] = useState<XTerm | null>(null);
  const [resizeHandler, setResizeHandler] = useState<((cols: number, rows: number) => void) | null>(
    null,
  );

  useEffect(() => {
    async function loadSession() {
      try {
        const data = await fetchSession(sessionId);
        setSession(data);
      } catch {
        setError('Session not found');
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, [sessionId]);

  const handleTerminalReady = useCallback((xterm: XTerm) => {
    setXtermInstance(xterm);
  }, []);

  const handleResizeReady = useCallback((handler: (cols: number, rows: number) => void) => {
    setResizeHandler(() => handler);
  }, []);

  const replay = useReplayController(sessionId, xtermInstance, resizeHandler ?? undefined);

  const { isPlaying, isLoading: replayLoading, currentTime, totalDuration, playbackSpeed, play, pause, seek, setSpeed } = replay;

  // Apply initial speed
  useEffect(() => {
    if (initialSpeed !== 1) {
      setSpeed(initialSpeed);
    }
  }, [initialSpeed, setSpeed]);

  // Seek to start time once loaded
  useEffect(() => {
    if (startTime > 0 && totalDuration > 0) {
      seek(startTime);
    }
  }, [startTime, totalDuration, seek]);

  // Handle autoplay=0
  useEffect(() => {
    if (!autoplay && isPlaying) {
      pause();
    }
  }, [autoplay, isPlaying, pause]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-shout-bg">
        <div className="text-shout-muted text-sm">Loading session...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="h-screen flex items-center justify-center bg-shout-bg">
        <div className="text-shout-muted text-sm">Session not found</div>
      </div>
    );
  }

  const sessionUrl = `https://shout.run/${session.username}/${sessionId}`;

  return (
    <div className="h-screen flex flex-col relative">
      {/* Terminal fills available space */}
      <Terminal
        sessionId={sessionId}
        isLive={false}
        sessionTitle={session.title || undefined}
        replayMode={true}
        onTerminalReady={handleTerminalReady}
        onResizeReady={handleResizeReady}
      />

      {/* Player bar at bottom */}
      {showControls && !replayLoading && totalDuration > 0 && (
        <PlayerBar
          isPlaying={isPlaying}
          currentTime={currentTime}
          totalDuration={totalDuration}
          playbackSpeed={playbackSpeed}
          onPlay={play}
          onPause={pause}
          onSeek={seek}
          onSpeedChange={setSpeed}
        />
      )}

      {/* Powered by shout watermark */}
      <a
        href={sessionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-1 right-2 text-[10px] text-shout-muted/50 hover:text-shout-muted/80 transition-colors z-10"
        style={showControls && !replayLoading && totalDuration > 0 ? { bottom: '3.25rem' } : undefined}
      >
        shout.run
      </a>
    </div>
  );
}
