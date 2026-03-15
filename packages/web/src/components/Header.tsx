'use client';

import Link from 'next/link';
import { useStore } from '@/lib/store';
import { useTheme } from '@/components/ThemeProvider';

export function Header() {
  const { liveSessions } = useStore();
  const { theme, toggleTheme } = useTheme();
  const liveCount = liveSessions.length;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-shout-bg/80 border-b border-shout-border">
      <div className="max-w-3xl mx-auto px-4 h-12 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-lg font-bold font-mono tracking-tight">shout</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-shout-green"></span>
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-shout-muted hover:text-shout-text transition-colors flex items-center gap-1.5"
          >
            feed
            {liveCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-shout-green/10 text-shout-green text-xs font-medium px-1.5 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-pulse-live absolute inline-flex h-full w-full rounded-full bg-shout-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-shout-green"></span>
                </span>
                {liveCount}
              </span>
            )}
          </Link>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-shout-muted hover:text-shout-text transition-colors rounded-md hover:bg-shout-surface"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
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
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
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
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
