'use client';

import { useCallback } from 'react';
import { formatDuration } from '@/lib/time';

interface PlayerBarProps {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  playbackSpeed: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (timeMs: number) => void;
  onSpeedChange: (speed: number) => void;
}

const SPEEDS = [1, 2, 4];

export function PlayerBar({
  isPlaying,
  currentTime,
  totalDuration,
  playbackSpeed,
  onPlay,
  onPause,
  onSeek,
  onSpeedChange,
}: PlayerBarProps) {
  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = parseFloat(e.target.value);
      onSeek((pct / 100) * totalDuration);
    },
    [onSeek, totalDuration],
  );

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(playbackSpeed);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    onSpeedChange(next);
  }, [playbackSpeed, onSpeedChange]);

  return (
    <div className="h-12 bg-shout-surface border-t border-shout-border flex items-center gap-3 px-4 flex-shrink-0">
      {/* Play/Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="flex items-center justify-center w-8 h-8 rounded hover:bg-shout-surface-hover transition-colors text-shout-text"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36A1 1 0 008 5.14z" />
          </svg>
        )}
      </button>

      {/* Time */}
      <span className="font-mono text-xs text-shout-muted tabular-nums w-[110px] text-center select-none">
        {formatDuration(currentTime)} / {formatDuration(totalDuration)}
      </span>

      {/* Slider */}
      <input
        type="range"
        min="0"
        max="100"
        step="0.1"
        value={progress}
        onChange={handleSliderChange}
        className="replay-slider flex-1"
        style={{
          background: `linear-gradient(to right, var(--shout-accent) 0%, var(--shout-accent) ${progress}%, var(--shout-border) ${progress}%, var(--shout-border) 100%)`,
        }}
        aria-label="Seek through replay"
      />

      {/* Speed */}
      <button
        onClick={cycleSpeed}
        className="font-mono text-xs text-shout-muted hover:text-shout-text transition-colors px-2 py-1 rounded hover:bg-shout-surface-hover tabular-nums min-w-[36px] text-center"
        aria-label={`Playback speed: ${playbackSpeed}x`}
      >
        {playbackSpeed}x
      </button>
    </div>
  );
}
