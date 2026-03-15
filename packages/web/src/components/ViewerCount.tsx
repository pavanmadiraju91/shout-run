'use client';

import { useEffect, useState } from 'react';

interface ViewerCountProps {
  count: number;
}

export function ViewerCount({ count }: ViewerCountProps) {
  const [displayCount, setDisplayCount] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (count !== displayCount) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayCount(count);
        setIsAnimating(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [count, displayCount]);

  return (
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
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
      <span
        className={`tabular-nums transition-opacity duration-150 ${
          isAnimating ? 'opacity-50' : 'opacity-100'
        }`}
      >
        {displayCount.toLocaleString()}
      </span>
    </div>
  );
}
