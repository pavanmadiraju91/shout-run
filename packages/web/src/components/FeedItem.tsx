'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getVoterId, hasVoted, markVoted, upvoteSession } from '@/lib/api';
import { useStore } from '@/lib/store';
import { formatDurationHuman } from '@/lib/time';
import type { FeedItem as FeedItemType } from '@/lib/store';

interface FeedItemProps {
  item: FeedItemType;
  index?: number;
}

export function FeedItem({ item, index = 0 }: FeedItemProps) {
  const [voted, setVoted] = useState(() => hasVoted(item.id));
  const [localUpvotes, setLocalUpvotes] = useState(item.upvotes);
  const [isVoting, setIsVoting] = useState(false);
  const [elapsed, setElapsed] = useState(() =>
    item.isLive ? Date.now() - new Date(item.startedAt).getTime() : 0,
  );
  const { updateUpvotes } = useStore();

  // Tick elapsed time for live sessions
  useEffect(() => {
    if (!item.isLive) return;
    const id = setInterval(() => {
      setElapsed(Date.now() - new Date(item.startedAt).getTime());
    }, 1000);
    return () => clearInterval(id);
  }, [item.isLive, item.startedAt]);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (voted || isVoting) return;

    setVoted(true);
    setLocalUpvotes((prev) => prev + 1);
    markVoted(item.id);
    setIsVoting(true);

    const result = await upvoteSession(item.id, getVoterId());
    if (result) {
      setLocalUpvotes(result.upvotes);
      updateUpvotes(item.id, result.upvotes);
    }
    setIsVoting(false);
  };

  const timeAgo = formatDistanceToNow(new Date(item.startedAt), { addSuffix: false });

  const duration = item.isLive
    ? elapsed
    : item.endedAt
      ? new Date(item.endedAt).getTime() - new Date(item.startedAt).getTime()
      : 0;

  return (
    <Link
      href={`/${item.username}/${item.id}`}
      className="group flex flex-col sm:flex-row items-stretch gap-4 bg-shout-surface rounded-xl p-4 sm:p-5 border border-shout-border/60 hover:border-shout-border hover:bg-shout-surface-hover transition-all duration-200 opacity-0 animate-feed-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Terminal thumbnail */}
      <div className="relative flex-shrink-0 w-full sm:w-60 h-32 sm:h-36 rounded-lg overflow-hidden bg-[#0d1117] select-none pointer-events-none">
        <div className="absolute inset-0 p-3 font-mono text-[11px] leading-relaxed">
          <p className="text-shout-green truncate">
            <span className="text-shout-muted/60">$</span> {item.title || 'Untitled session'}
          </p>
          <p className="text-shout-muted/70 mt-1 truncate">
            @{item.username} &middot; {timeAgo} ago
          </p>
          {item.description && (
            <p className="text-shout-muted/50 mt-1.5 line-clamp-2">{item.description}</p>
          )}
        </div>
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d1117] to-transparent" />

        {/* Live indicator or play icon */}
        {item.isLive ? (
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-shout-green" />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-shout-green">
              Streaming
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-4 h-4 text-white/80 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {/* Title */}
          <h3 className="text-base sm:text-lg font-semibold text-shout-text leading-snug truncate">
            {item.title || 'Untitled session'}
          </h3>

          {/* Username + time */}
          <p className="text-sm text-shout-muted mt-1 truncate">
            @{item.username}
            <span className="mx-1.5">&middot;</span>
            {timeAgo} ago
            {item.isLive && (
              <>
                <span className="mx-1.5">&middot;</span>
                <span className="inline-flex items-center gap-1 text-shout-green">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green" />
                  </span>
                  Live
                </span>
              </>
            )}
          </p>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-shout-muted">
          {/* Upvote */}
          <button
            onClick={handleUpvote}
            disabled={voted}
            className={`inline-flex items-center gap-1 transition-all duration-150 ${
              voted
                ? 'text-shout-green cursor-default'
                : 'hover:text-shout-green active:scale-125 cursor-pointer'
            }`}
            aria-label={voted ? 'Already voted' : 'Upvote'}
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
              <path d="M8 2l6 8H2l6-8z" />
            </svg>
            {localUpvotes}
          </button>

          {/* Viewer count (live only) */}
          {item.isLive && item.viewerCount > 0 && (
            <span className="inline-flex items-center gap-1 text-shout-green">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {item.viewerCount} watching
            </span>
          )}

          {/* Duration */}
          {duration > 0 && (
            <span
              className={`inline-flex items-center gap-1 ${item.isLive ? 'text-shout-green' : ''}`}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatDurationHuman(duration)}
            </span>
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="flex-shrink-0 flex items-center sm:items-start sm:pt-1">
        {item.isLive ? (
          <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-shout-green/15 text-shout-green border border-shout-green/30 group-hover:bg-shout-green group-hover:text-[#0d1117] transition-all duration-200">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Join Shell
          </span>
        ) : (
          <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border border-shout-border text-shout-muted group-hover:bg-shout-text group-hover:text-shout-bg group-hover:border-shout-text transition-all duration-200">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch Log
          </span>
        )}
      </div>
    </Link>
  );
}
