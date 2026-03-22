'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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

  const initial = item.username.charAt(0).toUpperCase();

  return (
    <div
      className="group flex items-start gap-3 py-3 px-3 hover:bg-shout-surface/30 transition-colors opacity-0 animate-feed-in"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Avatar */}
      <Link href={`/${item.username}`} className="flex-shrink-0 mt-0.5">
        {item.avatarUrl ? (
          <Image
            src={item.avatarUrl}
            alt={item.username}
            width={32}
            height={32}
            className="rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-shout-surface border border-shout-border flex items-center justify-center text-xs font-medium text-shout-muted">
            {initial}
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Line 1: username · time ago   [LIVE badge] */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-shout-muted truncate">
            <Link
              href={`/${item.username}`}
              className="font-medium text-shout-text hover:underline transition-colors"
            >
              {item.username}
            </Link>
            <span className="mx-1">&middot;</span>
            {timeAgo} ago
          </p>

          {item.isLive && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-shout-green/15 text-shout-green px-1.5 py-px rounded">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green"></span>
              </span>
              live
            </span>
          )}
        </div>

        {/* Line 2: session title + description */}
        <div className="mt-0.5">
          <Link
            href={`/${item.username}/${item.id}`}
            className="text-sm font-medium text-shout-text hover:text-shout-accent transition-colors leading-snug"
          >
            {item.title || 'Untitled session'}
          </Link>
          {item.description && (
            <span className="text-sm text-shout-muted ml-1.5">{item.description}</span>
          )}
        </div>

        {/* Line 3: engagement row */}
        <div className="flex items-center gap-4 mt-1.5 text-xs text-shout-muted">
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
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
              <path d="M8 2l6 8H2l6-8z" />
            </svg>
            {localUpvotes}
          </button>

          {/* Viewer count (live only) */}
          {item.isLive && item.viewerCount > 0 && (
            <span className="inline-flex items-center gap-1 text-shout-green">
              <svg
                viewBox="0 0 24 24"
                className="w-3 h-3"
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
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {item.isLive ? `recording ${formatDurationHuman(duration)}` : formatDurationHuman(duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
