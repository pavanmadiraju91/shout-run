'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { getVoterId, hasVoted, markVoted, upvoteSession } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { FeedItem as FeedItemType } from '@/lib/store';

interface FeedItemProps {
  item: FeedItemType;
  rank: number;
}

export function FeedItem({ item, rank }: FeedItemProps) {
  const [voted, setVoted] = useState(() => hasVoted(item.id));
  const [localUpvotes, setLocalUpvotes] = useState(item.upvotes);
  const [isVoting, setIsVoting] = useState(false);
  const { updateUpvotes } = useStore();

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (voted || isVoting) return;

    // Optimistic update
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

  return (
    <div className="group flex items-start gap-0 py-2 px-3 hover:bg-shout-surface/50 transition-colors rounded-md">
      {/* Rank */}
      <span className="w-8 flex-shrink-0 text-right text-sm tabular-nums text-shout-muted pt-0.5 select-none">
        {rank}.
      </span>

      {/* Upvote button */}
      <button
        onClick={handleUpvote}
        disabled={voted}
        className={`w-8 flex-shrink-0 flex flex-col items-center pt-0.5 transition-colors ${
          voted
            ? 'text-shout-green cursor-default'
            : 'text-shout-muted hover:text-shout-green cursor-pointer'
        }`}
        aria-label={voted ? 'Already voted' : 'Upvote'}
      >
        <svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5"
          fill="currentColor"
        >
          <path d="M8 2l6 8H2l6-8z" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/${item.username}/${item.id}`}
            className="text-sm font-medium text-shout-text hover:text-shout-accent transition-colors leading-snug"
          >
            {item.title || 'Untitled session'}
          </Link>

          {item.isLive && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-shout-green/15 text-shout-green px-1.5 py-px rounded">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green"></span>
              </span>
              live
            </span>
          )}
        </div>

        {/* Meta line */}
        <p className="text-xs text-shout-muted mt-0.5 leading-relaxed">
          {localUpvotes} point{localUpvotes !== 1 ? 's' : ''}
          {' · by '}
          <Link
            href={`/${item.username}`}
            className="hover:text-shout-text hover:underline transition-colors"
          >
            {item.username}
          </Link>
          {' · '}
          {timeAgo} ago
          {item.isLive && item.viewerCount > 0 && (
            <>
              {' · '}
              <span className="text-shout-green">{item.viewerCount} watching</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
