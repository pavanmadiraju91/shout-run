'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Terminal as XTerm } from '@xterm/xterm';

interface ReplayChunk {
  type: string;
  timestamp: number;
  data?: string;
  cols?: number;
  rows?: number;
}

export interface ReplayState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  playbackSpeed: number;
  isLoading: boolean;
}

export interface ReplayControls {
  play: () => void;
  pause: () => void;
  seek: (timeMs: number) => void;
  setSpeed: (speed: number) => void;
}

export function useReplayController(
  sessionId: string,
  xterm: XTerm | null,
  onResize?: (cols: number, rows: number) => void,
): ReplayState & ReplayControls {
  const [chunks, setChunks] = useState<ReplayChunk[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const chunksRef = useRef<ReplayChunk[]>([]);
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const speedRef = useRef(1);
  const chunkIndexRef = useRef(0);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef(0);
  const baseTimestampRef = useRef(0);

  // Fetch replay data on mount
  useEffect(() => {
    if (!sessionId) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    fetch(`${apiUrl}/api/sessions/${sessionId}/replay`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load replay');
        return res.json();
      })
      .then((json) => {
        const data = json.data;
        if (!data?.chunks || data.chunks.length === 0) {
          setIsLoading(false);
          return;
        }

        const replayChunks: ReplayChunk[] = data.chunks;
        const baseTs = replayChunks[0].timestamp;
        baseTimestampRef.current = baseTs;
        const duration = replayChunks[replayChunks.length - 1].timestamp - baseTs;

        chunksRef.current = replayChunks;
        setChunks(replayChunks);
        setTotalDuration(duration);
        setIsLoading(false);

        // Auto-play on load
        isPlayingRef.current = true;
        setIsPlaying(true);
      })
      .catch((err) => {
        console.error('Failed to fetch replay data:', err);
        setIsLoading(false);
      });
  }, [sessionId]);

  // Write chunks from startIdx up to (and including) targetTime instantly
  const replayTo = useCallback(
    (targetTime: number): number => {
      if (!xterm) return 0;
      const base = baseTimestampRef.current;
      const allChunks = chunksRef.current;

      let idx = 0;
      for (; idx < allChunks.length; idx++) {
        const chunkTime = allChunks[idx].timestamp - base;
        if (chunkTime > targetTime) break;

        const chunk = allChunks[idx];
        if (chunk.type === 'resize' && chunk.cols && chunk.rows) {
          onResize?.(chunk.cols, chunk.rows);
        } else if (chunk.data) {
          xterm.write(chunk.data);
        }
      }
      return idx;
    },
    [xterm, onResize],
  );

  // Playback loop via requestAnimationFrame
  useEffect(() => {
    if (!xterm || chunks.length === 0) return;

    const tick = (now: number) => {
      if (!isPlayingRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastFrameRef.current === 0) {
        lastFrameRef.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const delta = (now - lastFrameRef.current) * speedRef.current;
      lastFrameRef.current = now;

      const newTime = currentTimeRef.current + delta;
      const base = baseTimestampRef.current;
      const allChunks = chunksRef.current;
      const duration = totalDuration;

      // Write any chunks that fall within the elapsed window
      while (chunkIndexRef.current < allChunks.length) {
        const chunk = allChunks[chunkIndexRef.current];
        const chunkTime = chunk.timestamp - base;
        if (chunkTime > newTime) break;

        if (chunk.type === 'resize' && chunk.cols && chunk.rows) {
          onResize?.(chunk.cols, chunk.rows);
        } else if (chunk.data) {
          xterm.write(chunk.data);
        }
        chunkIndexRef.current++;
      }

      currentTimeRef.current = newTime;
      setCurrentTime(newTime);

      // Check if replay is done
      if (newTime >= duration) {
        currentTimeRef.current = duration;
        setCurrentTime(duration);
        isPlayingRef.current = false;
        setIsPlaying(false);
        lastFrameRef.current = 0;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [xterm, chunks, totalDuration, onResize]);

  const play = useCallback(() => {
    // If at end, restart from beginning
    if (currentTimeRef.current >= totalDuration && totalDuration > 0) {
      if (!xterm) return;
      xterm.reset();
      currentTimeRef.current = 0;
      chunkIndexRef.current = 0;
      setCurrentTime(0);
    }
    lastFrameRef.current = 0;
    isPlayingRef.current = true;
    setIsPlaying(true);
  }, [xterm, totalDuration]);

  const pause = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    lastFrameRef.current = 0;
  }, []);

  const seek = useCallback(
    (timeMs: number) => {
      if (!xterm) return;
      const clamped = Math.max(0, Math.min(timeMs, totalDuration));

      // Reset terminal and replay all chunks up to target
      xterm.reset();
      chunkIndexRef.current = replayTo(clamped);
      currentTimeRef.current = clamped;
      setCurrentTime(clamped);
      lastFrameRef.current = 0;
    },
    [xterm, totalDuration, replayTo],
  );

  const setSpeed = useCallback((speed: number) => {
    speedRef.current = speed;
    setPlaybackSpeed(speed);
  }, []);

  return {
    isPlaying,
    currentTime,
    totalDuration,
    playbackSpeed,
    isLoading,
    play,
    pause,
    seek,
    setSpeed,
  };
}
