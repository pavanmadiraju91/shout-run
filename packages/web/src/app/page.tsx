'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { SessionCard } from '@/components/SessionCard';

export default function HomePage() {
  const { liveSessions, fetchLiveSessions } = useStore();

  useEffect(() => {
    fetchLiveSessions();
    const interval = setInterval(fetchLiveSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveSessions]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="border-b border-shout-border">
        <div className="max-w-6xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
            Watch developers work.{' '}
            <span className="text-shout-green">Live.</span>
          </h1>
          <p className="text-xl text-shout-muted mb-10 max-w-2xl mx-auto">
            Stream your terminal to the world. Watch others code in real-time.
            The live broadcasting platform built for developers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="bg-shout-surface border border-shout-border rounded-lg px-6 py-4 font-mono text-sm">
              <span className="text-shout-muted">$</span>{' '}
              <span className="text-shout-text">npm install -g shout-cli</span>
            </div>
            <Link
              href="https://github.com/pavanmadiraju91/ideal-robot"
              target="_blank"
              className="text-shout-accent hover:underline text-sm"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* Live Sessions Feed */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-shout-green"></span>
            </span>
            Live Now
          </h2>
          <span className="text-shout-muted text-sm">
            {liveSessions.length} {liveSessions.length === 1 ? 'session' : 'sessions'} live
          </span>
        </div>

        {liveSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {liveSessions.map((session) => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-shout-border border-dashed rounded-lg">
            <div className="text-6xl mb-4">
              <svg
                className="w-16 h-16 mx-auto text-shout-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium mb-2">No one is broadcasting right now</h3>
            <p className="text-shout-muted mb-6">Be the first to go live!</p>
            <div className="inline-block bg-shout-surface border border-shout-border rounded-lg px-4 py-2 font-mono text-sm">
              <span className="text-shout-muted">$</span> shout start
            </div>
          </div>
        )}
      </section>

      {/* How It Works Section */}
      <section className="border-t border-shout-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl font-semibold mb-10 text-center">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-shout-surface border border-shout-border rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-mono font-bold text-shout-accent">1</span>
              </div>
              <h3 className="font-medium mb-2">Install the CLI</h3>
              <p className="text-shout-muted text-sm">
                One command to install shout globally on your machine.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-shout-surface border border-shout-border rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-mono font-bold text-shout-accent">2</span>
              </div>
              <h3 className="font-medium mb-2">Start broadcasting</h3>
              <p className="text-shout-muted text-sm">
                Run <code className="bg-shout-surface px-1 rounded">shout start</code> and share your terminal.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-shout-surface border border-shout-border rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-mono font-bold text-shout-accent">3</span>
              </div>
              <h3 className="font-medium mb-2">Share the link</h3>
              <p className="text-shout-muted text-sm">
                Anyone can watch your terminal in real-time on the web.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
