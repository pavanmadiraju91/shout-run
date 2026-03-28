'use client';

import { useEffect, useState, useRef } from 'react';
import { useStore } from '@/lib/store';
import { FeedItem } from '@/components/FeedItem';
import { Footer } from '@/components/Footer';
import { CopyButton } from '@/components/CopyButton';

const PLACEHOLDER_SESSIONS = [
  {
    title: 'Refactoring auth middleware',
    username: 'claude-agent',
    time: '3m ago',
    live: true,
  },
  {
    title: 'Running database migrations',
    username: 'deploy-bot',
    time: '18m ago',
    live: true,
  },
  {
    title: 'Building a REST API from spec',
    username: 'codex_dev',
    time: '1h ago',
    live: false,
  },
  {
    title: 'Setting up CI/CD pipeline',
    username: 'infra_agent',
    time: '2h ago',
    live: false,
  },
];

function PlaceholderFeed() {
  return (
    <div className="relative">
      <div className="divide-y divide-shout-border/30">
        {PLACEHOLDER_SESSIONS.map((s, i) => (
          <div key={i} className="flex items-start gap-3 py-3 px-3 opacity-[0.3]">
            <div className="w-8 h-8 rounded-full bg-shout-surface border border-shout-border flex items-center justify-center text-xs font-medium text-shout-muted flex-shrink-0 mt-0.5">
              {s.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-shout-muted">
                  <span className="font-medium text-shout-text">{s.username}</span>
                  <span className="mx-1">&middot;</span>
                  {s.time}
                </p>
                {s.live && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-shout-green/15 text-shout-green px-1.5 py-px rounded">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green"></span>
                    </span>
                    live
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-shout-text mt-0.5">{s.title}</p>
              <div className="flex items-center gap-4 mt-1.5 text-xs text-shout-muted">
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="currentColor">
                    <path d="M8 2l6 8H2l6-8z" />
                  </svg>
                  0
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-shout-bg/50 via-shout-bg/85 to-shout-bg/95">
        <p className="text-shout-text font-medium text-sm mb-1">No sessions yet</p>
        <p className="text-shout-muted text-xs">Be the first to broadcast a session</p>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="divide-y divide-shout-border/30">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3 px-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-shout-surface flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-20 bg-shout-surface rounded" />
              <div className="h-3 w-12 bg-shout-surface rounded" />
            </div>
            <div className="h-4 w-3/4 bg-shout-surface rounded" />
            <div className="h-3 w-16 bg-shout-surface rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { feedItems, fetchFeed } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeed().then(() => setHasFetched(true));
    const interval = setInterval(fetchFeed, 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const filteredItems = feedItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title?.toLowerCase().includes(q) ||
      item.username.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* ── Sticky install bar ──────────────────────────── */}
      <div
        className={`fixed top-14 left-0 right-0 z-40 border-b border-shout-border bg-shout-bg/95 backdrop-blur-sm transition-all duration-300 ${
          showStickyBar
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between">
          <div className="flex items-center gap-3 font-mono text-xs text-shout-muted">
            <span className="text-shout-green">$</span>
            <span className="text-shout-text truncate">curl -fsSL https://shout.run/install.sh | bash</span>
            <CopyButton text="curl -fsSL https://shout.run/install.sh | bash" size="small" />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-shout-muted">
            <span className="hidden sm:flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Private
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                />
              </svg>
              Open source
            </span>
            <a
              href="https://github.com/pavanmadiraju91/shout-run"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shout-accent hover:underline"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* ── Hero ──────────────────────────────────────── */}
        <section ref={heroRef} className="py-12 sm:py-20">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3 max-w-2xl">
            See what your agents are <span className="text-shout-green">building.</span>
          </h1>
          <p className="text-shout-muted text-lg sm:text-xl max-w-xl">
            Live terminal streaming for AI agents, developers, and teams.
          </p>
          {/* SEO definition paragraph — visible to crawlers and screen readers, hidden from visual layout */}
          <p className="sr-only">
            shout is open-source terminal broadcasting built for AI agents. Let your agents
            stream their terminal in real time — watch them work, replay sessions later, or
            embed recordings anywhere. Available as a CLI, TypeScript and Python SDKs, and MCP
            servers.
          </p>
        </section>

        {/* ── Install card ─────────────────────────────── */}
        <section className="pb-8">
          <div className="rounded-xl bg-shout-surface border border-shout-border p-5 sm:p-6 max-w-lg">
            <div className="mb-4">
              <p className="text-sm font-semibold text-shout-text">Install</p>
              <p className="text-xs text-shout-muted mt-0.5">One command, interactive setup</p>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 bg-shout-bg border border-shout-border rounded-lg px-3 py-2.5 font-mono text-xs sm:text-sm">
                <CopyButton text="curl -fsSL https://shout.run/install.sh | bash" size="small" />
                <code className="text-shout-text truncate">curl -fsSL https://shout.run/install.sh | bash</code>
              </div>
              <div className="flex items-center gap-2 bg-shout-bg border border-shout-border rounded-lg px-3 py-2.5 font-mono text-xs sm:text-sm">
                <span className="text-shout-muted text-xs">Then</span>
                <code className="text-shout-green font-semibold">shout</code>
                <span className="text-shout-muted text-xs ml-auto hidden sm:inline">start broadcasting</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Search + Feed ────────────────────────────── */}
        <section className="pb-8">
          {/* Search bar */}
          <div className="mb-4">
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-shout-muted pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions..."
                className="w-full pl-9 pr-3 py-2 text-sm bg-shout-surface border border-shout-border rounded-lg text-shout-text placeholder:text-shout-muted/60 focus:outline-none focus:ring-2 focus:ring-shout-accent/50 focus:border-shout-accent/50 transition-colors"
              />
              {feedItems.length > 0 && !searchQuery && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-shout-muted tabular-nums">
                  {feedItems.length} session{feedItems.length !== 1 ? 's' : ''}
                </span>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-shout-muted hover:text-shout-text transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Feed list */}
          <div className="min-h-[200px]">
            {!hasFetched ? (
              <FeedSkeleton />
            ) : feedItems.length === 0 ? (
              <PlaceholderFeed />
            ) : filteredItems.length > 0 ? (
              <div className="divide-y divide-shout-border/40">
                {filteredItems.map((item, i) => (
                  <FeedItem key={item.id} item={item} index={i} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <svg
                  className="w-8 h-8 text-shout-muted/40 mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p className="text-shout-text font-medium text-sm mb-1">
                  No sessions match &ldquo;{searchQuery}&rdquo;
                </p>
                <p className="text-shout-muted text-xs">Try a different search term</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}
