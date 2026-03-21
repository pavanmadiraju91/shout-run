'use client';

import { useState } from 'react';

export function CopyButton({
  text,
  size = 'default',
}: {
  text: string;
  size?: 'default' | 'small';
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const iconSize = size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <button
      onClick={handleCopy}
      className="text-shout-muted hover:text-shout-text transition-colors"
      title="Copy"
    >
      {copied ? (
        <svg
          className={`${iconSize} text-shout-green`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className={iconSize} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
      )}
    </button>
  );
}
