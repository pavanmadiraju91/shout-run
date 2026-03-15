import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'shout-bg': 'var(--shout-bg)',
        'shout-surface': 'var(--shout-surface)',
        'shout-surface-hover': 'var(--shout-surface-hover)',
        'shout-border': 'var(--shout-border)',
        'shout-text': 'var(--shout-text)',
        'shout-text-secondary': 'var(--shout-text-secondary)',
        'shout-muted': 'var(--shout-muted)',
        'shout-accent': 'var(--shout-accent)',
        'shout-green': 'var(--shout-green)',
        'shout-red': 'var(--shout-red)',
        'shout-yellow': 'var(--shout-yellow)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-live': 'pulse-live 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-live': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
