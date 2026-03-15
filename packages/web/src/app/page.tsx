'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { FeedItem } from '@/components/FeedItem';

export default function HomePage() {
  const { feedItems, fetchFeed } = useStore();

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const liveItems = feedItems.filter((item) => item.isLive);
  const recentItems = feedItems.filter((item) => !item.isLive);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Feed container */}
      <div className="border border-shout-border rounded-lg bg-shout-surface/30 overflow-hidden">
        {/* Live section */}
        {liveItems.length > 0 && (
          <div>
            <div className="px-3 py-2 border-b border-shout-border bg-shout-surface/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-shout-green flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green"></span>
                </span>
                Live now
              </h2>
            </div>
            <div className="divide-y divide-shout-border/50">
              {liveItems.map((item, i) => (
                <FeedItem key={item.id} item={item} rank={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Recent section */}
        {recentItems.length > 0 && (
          <div>
            <div className="px-3 py-2 border-b border-t border-shout-border bg-shout-surface/50">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-shout-muted">
                Recent
              </h2>
            </div>
            <div className="divide-y divide-shout-border/50">
              {recentItems.map((item, i) => (
                <FeedItem
                  key={item.id}
                  item={item}
                  rank={liveItems.length + i + 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {feedItems.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="text-shout-muted text-sm mb-4">No sessions yet. Be the first.</div>
            <div className="inline-block bg-shout-surface border border-shout-border rounded px-3 py-1.5 font-mono text-xs">
              <span className="text-shout-muted">$</span> npx shout start
            </div>
          </div>
        )}
      </div>

      {/* Install CTA */}
      <div className="mt-6 text-center space-y-2">
        <div className="bg-shout-surface border border-shout-border rounded-lg px-4 py-2.5 font-mono text-sm inline-flex items-center gap-2">
          <span className="text-shout-muted">$</span>
          <span className="text-shout-text">npm install -g shout-cli</span>
          <button
            onClick={() => navigator.clipboard.writeText('npm install -g shout-cli')}
            className="ml-1 text-shout-muted hover:text-shout-text transition-colors"
            title="Copy to clipboard"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-shout-muted">
          Stream your terminal to the world.{' '}
          <Link
            href="https://github.com/pavanmadiraju91/ideal-robot"
            target="_blank"
            className="text-shout-accent hover:underline"
          >
            View source
          </Link>
        </p>
      </div>
    </div>
  );
}
