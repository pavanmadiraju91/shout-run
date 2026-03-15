'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { useStore } from '@/lib/store';
import { SessionCard } from '@/components/SessionCard';

export default function HomePage() {
  const { liveSessions, recentSessions, fetchLiveSessions, fetchRecentSessions } = useStore();

  useEffect(() => {
    fetchLiveSessions();
    fetchRecentSessions();
    const interval = setInterval(fetchLiveSessions, 10000);
    return () => clearInterval(interval);
  }, [fetchLiveSessions, fetchRecentSessions]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative border-b border-shout-border overflow-hidden">
        {/* Subtle gradient mesh background */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-br from-shout-green/5 via-transparent to-shout-accent/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-shout-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-shout-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            Watch developers work.{' '}
            <span className="text-shout-green">Live.</span>
          </h1>
          <p className="text-lg text-shout-muted mb-8 max-w-xl mx-auto">
            Stream your terminal to the world. Watch others code in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <div className="bg-shout-surface border border-shout-border rounded-lg px-5 py-3 font-mono text-sm inline-flex items-center gap-2">
              <span className="text-shout-muted">$</span>
              <span className="text-shout-text">npm install -g shout-cli</span>
              <button
                onClick={() => navigator.clipboard.writeText('npm install -g shout-cli')}
                className="ml-2 text-shout-muted hover:text-shout-text transition-colors"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
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

      {/* Live Sessions Section */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 uppercase tracking-wide">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-shout-green"></span>
            </span>
            Live Now
            {liveSessions.length > 0 && (
              <span className="text-sm font-normal bg-shout-green/10 text-shout-green px-2 py-0.5 rounded-full">
                {liveSessions.length}
              </span>
            )}
          </h2>
        </div>

        {liveSessions.length > 0 ? (
          <div className="space-y-6">
            {/* Featured first session */}
            {liveSessions.length >= 2 ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SessionCard session={liveSessions[0]} featured />
                  <SessionCard session={liveSessions[1]} featured />
                </div>
                {liveSessions.length > 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {liveSessions.slice(2).map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveSessions.map((session) => (
                  <SessionCard key={session.id} session={session} featured />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 border border-shout-border border-dashed rounded-lg bg-shout-surface/30">
            <svg
              className="w-10 h-10 mx-auto text-shout-muted mb-3"
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
            <p className="text-shout-muted text-sm mb-3">No one is broadcasting right now</p>
            <div className="inline-block bg-shout-surface border border-shout-border rounded-lg px-3 py-1.5 font-mono text-xs">
              <span className="text-shout-muted">$</span> shout start
            </div>
          </div>
        )}
      </section>

      {/* Recent Sessions Section */}
      {recentSessions.length > 0 && (
        <section className="border-t border-shout-border">
          <div className="max-w-6xl mx-auto px-4 py-10">
            <h2 className="text-lg font-semibold mb-6 uppercase tracking-wide text-shout-text-secondary">
              Recent
            </h2>

            <div className="space-y-3">
              {recentSessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/${session.username}/${session.id}`}
                  className="flex items-center gap-4 bg-shout-surface border border-shout-border rounded-lg p-4 hover:border-shout-muted hover:bg-shout-surface-hover transition-colors group"
                >
                  {session.avatarUrl ? (
                    <Image
                      src={session.avatarUrl}
                      alt={session.username}
                      width={36}
                      height={36}
                      className="rounded-full border border-shout-border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-shout-bg rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {session.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-shout-text truncate group-hover:text-shout-accent transition-colors">
                        {session.title || 'Untitled Session'}
                      </h3>
                      <span className="text-xs bg-shout-muted/10 text-shout-muted px-2 py-0.5 rounded flex-shrink-0">
                        Ended
                      </span>
                    </div>
                    {session.description && (
                      <p className="text-sm text-shout-text-secondary truncate mt-0.5">
                        {session.description}
                      </p>
                    )}
                    <p className="text-xs text-shout-muted mt-1">
                      {session.username}
                      {session.endedAt && (
                        <> &middot; ended {formatDistanceToNow(new Date(session.endedAt))} ago</>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-shout-muted flex-shrink-0">
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
                    <span className="tabular-nums">{session.viewerCount}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="border-t border-shout-border">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-lg font-semibold mb-10 text-center uppercase tracking-wide text-shout-text-secondary">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 bg-shout-surface border border-shout-border rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-lg font-mono font-bold text-shout-accent">1</span>
              </div>
              <h3 className="font-medium mb-1.5 text-sm">Install the CLI</h3>
              <p className="text-shout-muted text-sm">
                One command to install shout globally on your machine.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-shout-surface border border-shout-border rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-lg font-mono font-bold text-shout-accent">2</span>
              </div>
              <h3 className="font-medium mb-1.5 text-sm">Start broadcasting</h3>
              <p className="text-shout-muted text-sm">
                Run <code className="bg-shout-surface px-1 rounded">shout start</code> and share your terminal.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 bg-shout-surface border border-shout-border rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-lg font-mono font-bold text-shout-accent">3</span>
              </div>
              <h3 className="font-medium mb-1.5 text-sm">Share the link</h3>
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
