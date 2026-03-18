'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { FeedItem } from '@/components/FeedItem';
import { Footer } from '@/components/Footer';

type Tab = 'live' | 'recent';

const PLACEHOLDER_SESSIONS = [
  { title: 'Building a Rust CLI from scratch', username: 'rustacean', time: '12m ago', points: 42, viewers: 18, live: true },
  { title: 'Debugging a production memory leak', username: 'sre_wizard', time: '25m ago', points: 31, viewers: 9, live: true },
  { title: 'Live-coding a VS Code extension', username: 'vscode_dev', time: '1h ago', points: 27, viewers: 0, live: false },
  { title: 'Setting up Kubernetes the hard way', username: 'k8s_nerd', time: '2h ago', points: 19, viewers: 0, live: false },
];

function CopyButton({ text, size = 'default' }: { text: string; size?: 'default' | 'small' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const iconSize = size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <button onClick={handleCopy} className="text-shout-muted hover:text-shout-text transition-colors" title="Copy">
      {copied ? (
        <svg className={`${iconSize} text-shout-green`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function PlaceholderFeed() {
  return (
    <div className="relative">
      <div className="divide-y divide-shout-border/30">
        {PLACEHOLDER_SESSIONS.map((s, i) => (
          <div key={i} className="flex items-start gap-0 py-2.5 px-3 opacity-[0.3]">
            <span className="w-8 flex-shrink-0 text-right text-sm tabular-nums text-shout-muted pt-0.5 select-none">{i + 1}.</span>
            <div className="w-8 flex-shrink-0 flex flex-col items-center pt-0.5 text-shout-muted">
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor"><path d="M8 2l6 8H2l6-8z" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-shout-text">{s.title}</span>
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
              <p className="text-xs text-shout-muted mt-0.5">
                {s.points} points · by {s.username} · {s.time}
                {s.live && <span className="text-shout-green"> · {s.viewers} watching</span>}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-shout-bg/50 via-shout-bg/85 to-shout-bg/95 rounded-b-lg">
        <p className="text-shout-text font-medium text-sm mb-1">No one is broadcasting yet</p>
        <p className="text-shout-muted text-xs">Be the first to stream your terminal</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { feedItems, fetchFeed } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [showStickyBar, setShowStickyBar] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  // Intersection observer: show sticky bar when hero scrolls out of view
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

  const liveItems = feedItems.filter((item) => item.isLive);
  const recentItems = feedItems.filter((item) => !item.isLive);
  const activeItems = activeTab === 'live' ? liveItems : recentItems;

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
            <span className="text-shout-text">npm i -g shout-run</span>
            <CopyButton text="npm i -g shout-run" size="small" />
          </div>
          <div className="flex items-center gap-3 text-[11px] text-shout-muted">
            <span className="hidden sm:flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Private
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
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
        <section ref={heroRef} className="py-10 sm:py-12 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="shout.run" width={56} height={56} className="rounded-xl" priority />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            Watch developers code.{' '}
            <span className="text-shout-green">Live.</span>
          </h1>
          <p className="text-shout-muted text-sm sm:text-base max-w-md mx-auto">
            Stream your terminal to the world. No screen sharing, no setup, no accounts needed to watch.
          </p>
        </section>

        {/* ── How it works ──────────────────────────────── */}
        <section className="pb-8">
          <div className="grid grid-cols-3 gap-px bg-shout-border border border-shout-border rounded-lg overflow-hidden">
            <div className="bg-shout-bg px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">1</span>
                <span className="text-sm font-medium text-shout-text">Install</span>
              </div>
              <div className="flex items-center gap-2 bg-shout-surface border border-shout-border rounded px-2.5 py-1.5 font-mono text-xs mt-1">
                <span className="text-shout-green">$</span>
                <span className="text-shout-text flex-1">npm i -g shout-run</span>
                <CopyButton text="npm i -g shout-run" size="small" />
              </div>
            </div>
            <div className="bg-shout-bg px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">2</span>
                <span className="text-sm font-medium text-shout-text">Broadcast</span>
              </div>
              <div className="flex items-center gap-2 bg-shout-surface border border-shout-border rounded px-2.5 py-1.5 font-mono text-xs mt-1">
                <span className="text-shout-green">$</span>
                <span className="text-shout-text flex-1">shout</span>
                <CopyButton text="shout" size="small" />
              </div>
            </div>
            <div className="bg-shout-bg px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">3</span>
                <span className="text-sm font-medium text-shout-text">Share</span>
              </div>
              <div className="flex items-center bg-shout-surface border border-shout-border rounded px-2.5 py-1.5 font-mono text-xs mt-1">
                <span className="text-shout-text">shout.run/<span className="text-shout-accent">you</span>/abc123</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Feed ──────────────────────────────────────── */}
        <section className="pb-8">
          {/* Tab bar */}
          <div className="flex items-center gap-0 border-b border-shout-border">
            <button
              onClick={() => setActiveTab('live')}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'live' ? 'text-shout-green' : 'text-shout-muted hover:text-shout-text'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className={`absolute inline-flex h-full w-full rounded-full bg-shout-green ${activeTab === 'live' ? 'animate-ping opacity-75' : 'opacity-30'}`}></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green"></span>
                </span>
                Live
                {liveItems.length > 0 && (
                  <span className="text-xs bg-shout-green/15 text-shout-green px-1.5 py-px rounded-full">{liveItems.length}</span>
                )}
              </span>
              {activeTab === 'live' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-shout-green rounded-t" />}
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === 'recent' ? 'text-shout-text' : 'text-shout-muted hover:text-shout-text'
              }`}
            >
              <span className="flex items-center gap-1.5">
                Recent
                {recentItems.length > 0 && (
                  <span className="text-xs bg-shout-surface text-shout-muted px-1.5 py-px rounded-full">{recentItems.length}</span>
                )}
              </span>
              {activeTab === 'recent' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-shout-text rounded-t" />}
            </button>
          </div>

          {/* Feed list */}
          <div className="border border-t-0 border-shout-border rounded-b-lg bg-shout-surface/20 overflow-hidden min-h-[200px]">
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

      </div>

      <Footer />
    </>
  );
}
