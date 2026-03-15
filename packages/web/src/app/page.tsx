'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { FeedItem } from '@/components/FeedItem';

type Tab = 'live' | 'recent';

// Placeholder data to show the feed shape when empty
const PLACEHOLDER_SESSIONS = [
  {
    title: 'Building a Rust CLI from scratch',
    username: 'rustacean',
    time: '12m ago',
    points: 42,
    viewers: 18,
  },
  {
    title: 'Debugging a production memory leak',
    username: 'sre_wizard',
    time: '25m ago',
    points: 31,
    viewers: 9,
  },
  {
    title: 'Live-coding a VS Code extension',
    username: 'vscode_dev',
    time: '1h ago',
    points: 27,
    viewers: 5,
  },
  {
    title: 'Setting up Kubernetes the hard way',
    username: 'k8s_nerd',
    time: '2h ago',
    points: 19,
    viewers: 3,
  },
];

function PlaceholderFeed() {
  return (
    <div className="relative">
      {/* Ghost rows */}
      <div className="divide-y divide-shout-border/30">
        {PLACEHOLDER_SESSIONS.map((s, i) => (
          <div key={i} className="flex items-start gap-0 py-2.5 px-3 opacity-[0.35]">
            <span className="w-8 flex-shrink-0 text-right text-sm tabular-nums text-shout-muted pt-0.5 select-none">
              {i + 1}.
            </span>
            <div className="w-8 flex-shrink-0 flex flex-col items-center pt-0.5 text-shout-muted">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                <path d="M8 2l6 8H2l6-8z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-shout-text">{s.title}</span>
                {i < 2 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider bg-shout-green/15 text-shout-green px-1.5 py-px rounded">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green"></span>
                    </span>
                    live
                  </span>
                )}
              </div>
              <p className="text-xs text-shout-muted mt-0.5">
                {s.points} points · by {s.username} · {s.time}
                {i < 2 && <span className="text-shout-green"> · {s.viewers} watching</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-shout-bg/60 via-shout-bg/90 to-shout-bg/95 rounded-b-lg">
        <div className="text-center px-4">
          <p className="text-shout-text font-medium text-sm mb-1">No one is broadcasting yet</p>
          <p className="text-shout-muted text-xs mb-4">Be the first to stream your terminal</p>
          <div className="inline-flex items-center gap-2 bg-shout-surface border border-shout-border rounded-lg px-4 py-2 font-mono text-sm group cursor-pointer hover:border-shout-green/40 transition-colors"
            onClick={() => navigator.clipboard.writeText('npx shout start')}
          >
            <span className="text-shout-green">$</span>
            <span className="text-shout-text">npx shout start</span>
            <svg className="w-3.5 h-3.5 text-shout-muted group-hover:text-shout-text transition-colors ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 text-shout-muted hover:text-shout-text transition-colors"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-shout-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

export default function HomePage() {
  const { feedItems, fetchFeed } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('live');

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const liveItems = feedItems.filter((item) => item.isLive);
  const recentItems = feedItems.filter((item) => !item.isLive);
  const activeItems = activeTab === 'live' ? liveItems : recentItems;
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="py-10 sm:py-14 text-center">
        <div className="flex justify-center mb-5">
          <Image
            src="/logo.png"
            alt="shout.run logo"
            width={64}
            height={64}
            className="rounded-xl"
            priority
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          Watch developers code.{' '}
          <span className="text-shout-green">Live.</span>
        </h1>
        <p className="text-shout-muted text-sm sm:text-base max-w-md mx-auto mb-6">
          Stream your terminal to the world. No screen sharing, no setup, no accounts needed to watch.
        </p>

        {/* Install command */}
        <div className="inline-flex items-center gap-2 bg-shout-surface border border-shout-border rounded-lg px-4 py-2.5 font-mono text-sm hover:border-shout-muted transition-colors">
          <span className="text-shout-green">$</span>
          <span className="text-shout-text">npm i -g shout-cli</span>
          <CopyButton text="npm i -g shout-cli" />
        </div>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-4 mt-4 text-[11px] text-shout-muted">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Nothing stored server-side
          </span>
          <span className="text-shout-border">|</span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
            Open source
          </span>
          <span className="text-shout-border">|</span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Real-time WebSocket
          </span>
        </div>
      </section>

      {/* ── Feed ─────────────────────────────────────────── */}
      <section className="pb-10">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-shout-border mb-0">
          <button
            onClick={() => setActiveTab('live')}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'live'
                ? 'text-shout-green'
                : 'text-shout-muted hover:text-shout-text'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-shout-green ${activeTab === 'live' ? 'animate-ping opacity-75' : 'opacity-30'}`}></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green"></span>
              </span>
              Live
              {liveItems.length > 0 && (
                <span className="text-xs bg-shout-green/15 text-shout-green px-1.5 py-px rounded-full">
                  {liveItems.length}
                </span>
              )}
            </span>
            {activeTab === 'live' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-shout-green rounded-t" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('recent')}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'recent'
                ? 'text-shout-text'
                : 'text-shout-muted hover:text-shout-text'
            }`}
          >
            <span className="flex items-center gap-1.5">
              Recent
              {recentItems.length > 0 && (
                <span className="text-xs bg-shout-surface text-shout-muted px-1.5 py-px rounded-full">
                  {recentItems.length}
                </span>
              )}
            </span>
            {activeTab === 'recent' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-shout-text rounded-t" />
            )}
          </button>
        </div>

        {/* Feed content */}
        <div className="border border-t-0 border-shout-border rounded-b-lg bg-shout-surface/20 overflow-hidden">
          {activeItems.length > 0 ? (
            <div className="divide-y divide-shout-border/40">
              {activeItems.map((item, i) => (
                <FeedItem key={item.id} item={item} rank={i + 1} />
              ))}
            </div>
          ) : (
            <PlaceholderFeed />
          )}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="pb-14">
        <div className="border border-shout-border rounded-lg bg-shout-surface/20 overflow-hidden">
          <div className="px-4 py-3 border-b border-shout-border">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-shout-muted font-mono">
              How it works
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-shout-border/50">
            <div className="px-5 py-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">1</span>
                <h3 className="text-sm font-medium text-shout-text">Install</h3>
              </div>
              <div className="font-mono text-xs text-shout-muted bg-shout-bg/50 rounded px-2.5 py-1.5 border border-shout-border/50">
                <span className="text-shout-green">$</span> npm i -g shout-cli
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">2</span>
                <h3 className="text-sm font-medium text-shout-text">Broadcast</h3>
              </div>
              <div className="font-mono text-xs text-shout-muted bg-shout-bg/50 rounded px-2.5 py-1.5 border border-shout-border/50">
                <span className="text-shout-green">$</span> shout start
              </div>
            </div>
            <div className="px-5 py-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">3</span>
                <h3 className="text-sm font-medium text-shout-text">Share</h3>
              </div>
              <div className="font-mono text-xs text-shout-muted bg-shout-bg/50 rounded px-2.5 py-1.5 border border-shout-border/50">
                shout.run/<span className="text-shout-accent">you</span>/abc123
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
