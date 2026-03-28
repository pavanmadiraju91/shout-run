'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '@/lib/store';
import { FeedItem } from '@/components/FeedItem';
import { Footer } from '@/components/Footer';
import { CopyButton } from '@/components/CopyButton';

function CopyToast({ show }: { show: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-shout-surface border border-shout-border rounded-lg px-4 py-3 shadow-xl shadow-black/20 transition-all duration-300 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <svg className="w-5 h-5 text-shout-green shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="text-sm font-medium text-shout-text">Install command copied!</span>
    </div>
  );
}

function CopyableLine({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setShowToast(true);
    setTimeout(() => setCopied(false), 2000);
    setTimeout(() => setShowToast(false), 2500);
  }, [text]);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={handleCopy}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCopy(); }}
        className="flex items-center gap-2 cursor-pointer group rounded -mx-2 px-2 py-1 hover:bg-shout-surface/50 active:bg-shout-surface/70 transition-colors outline-none focus-visible:ring-1 focus-visible:ring-shout-muted/50"
        title="Click to copy"
      >
        <span className="text-shout-green select-none shrink-0">$</span>
        <code className="text-shout-text truncate">{text}</code>
        <span className="inline-block w-[7px] h-[15px] bg-shout-text/70 animate-[blink_1s_step-end_infinite] shrink-0" />
        <span className="ml-auto shrink-0 text-shout-muted opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? (
            <svg className="w-3.5 h-3.5 text-shout-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </span>
      </div>
      <CopyToast show={showToast} />
    </>
  );
}

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
      <div className="space-y-3">
        {PLACEHOLDER_SESSIONS.map((s, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row items-stretch gap-4 bg-shout-surface rounded-xl p-4 sm:p-5 border border-shout-border/60 opacity-[0.3]"
          >
            {/* Faux terminal thumbnail */}
            <div className="relative flex-shrink-0 w-full sm:w-60 h-32 sm:h-36 rounded-lg overflow-hidden bg-[#0d1117] select-none">
              <div className="absolute inset-0 p-3 font-mono text-[11px] leading-relaxed">
                <p className="text-shout-green truncate">
                  <span className="text-shout-muted/60">$</span> {s.title}
                </p>
                <p className="text-shout-muted/70 mt-1 truncate">
                  @{s.username} &middot; {s.time}
                </p>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d1117] to-transparent" />
              {s.live && (
                <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-shout-green" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-shout-green">
                    Streaming
                  </span>
                </div>
              )}
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-shout-text truncate">
                  {s.title}
                </h3>
                <p className="text-sm text-shout-muted mt-1 truncate">
                  @{s.username}
                  <span className="mx-1.5">&middot;</span>
                  {s.time}
                </p>
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-shout-muted">
                <span className="inline-flex items-center gap-1">
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                    <path d="M8 2l6 8H2l6-8z" />
                  </svg>
                  0
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-shout-bg/50 via-shout-bg/85 to-shout-bg/95 rounded-xl">
        <p className="text-shout-text font-medium text-sm mb-1">No sessions yet</p>
        <p className="text-shout-muted text-xs">Be the first to broadcast a session</p>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col sm:flex-row items-stretch gap-4 bg-shout-surface rounded-xl p-4 sm:p-5 border border-shout-border/60 animate-pulse"
        >
          {/* Thumbnail skeleton */}
          <div className="flex-shrink-0 w-full sm:w-60 h-32 sm:h-36 rounded-lg bg-shout-border/20" />
          {/* Content skeleton */}
          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div className="space-y-2">
              <div className="h-5 w-3/4 bg-shout-border/20 rounded" />
              <div className="h-4 w-1/2 bg-shout-border/20 rounded" />
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="h-3.5 w-10 bg-shout-border/20 rounded" />
              <div className="h-3.5 w-16 bg-shout-border/20 rounded" />
            </div>
          </div>
          {/* Button skeleton */}
          <div className="flex-shrink-0 flex items-start pt-1">
            <div className="h-9 w-28 bg-shout-border/20 rounded-lg" />
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
        <section ref={heroRef} className="pt-12 sm:pt-20 pb-8 sm:pb-10">
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

        {/* ── Install terminal ─────────────────────────── */}
        <section className="pb-10">
          <div className="rounded-lg overflow-hidden border border-shout-border">
            {/* Terminal title bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-shout-surface-dim border-b border-shout-border">
              <span className="w-3 h-3 rounded-full bg-[#ff5f57] opacity-50" />
              <span className="w-3 h-3 rounded-full bg-[#febc2e] opacity-50" />
              <span className="w-3 h-3 rounded-full bg-[#28c840] opacity-50" />
              <span className="ml-2 text-xs text-shout-muted font-mono">your favorite terminal</span>
            </div>
            {/* Terminal body */}
            <div className="bg-shout-bg px-4 py-4 font-mono text-sm space-y-3">
              <CopyableLine text="curl -fsSL https://shout.run/install.sh | bash" />
              <div className="flex items-center gap-2">
                <span className="text-shout-green select-none shrink-0">$</span>
                <code className="text-shout-text">shout</code>
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
                className="w-full pl-9 pr-3 py-2 text-sm bg-shout-bg border border-shout-border rounded-lg text-shout-text placeholder:text-shout-muted/60 focus:outline-none focus:ring-2 focus:ring-shout-accent/50 focus:border-shout-accent/50 transition-colors"
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
              <div className="space-y-3">
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
