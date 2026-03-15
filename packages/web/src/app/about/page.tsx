import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-6">About shout</h1>

      <div className="prose prose-invert prose-shout max-w-none space-y-6 text-shout-muted">
        <p className="text-lg text-shout-text">
          shout is a live terminal broadcasting platform built for developers.
          Stream your terminal to the world in real-time.
        </p>

        <h2 className="text-2xl font-semibold text-shout-text mt-10 mb-4">
          Why shout?
        </h2>

        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-shout-green mt-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span>
              <strong className="text-shout-text">Zero friction.</strong> No OBS, no setup. Just{' '}
              <code className="bg-shout-surface px-1.5 py-0.5 rounded text-sm">shout start</code>{' '}
              and you&apos;re live.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-shout-green mt-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span>
              <strong className="text-shout-text">Privacy first.</strong> Automatic secret detection
              redacts API keys, tokens, and passwords before they leave your machine.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-shout-green mt-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span>
              <strong className="text-shout-text">Built for developers.</strong> Optimized for terminal
              output with full ANSI color support, clickable links, and responsive sizing.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-shout-green mt-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span>
              <strong className="text-shout-text">Open source.</strong> Built in public. Contribute on
              GitHub.
            </span>
          </li>
        </ul>

        <h2 className="text-2xl font-semibold text-shout-text mt-10 mb-4">
          How it works
        </h2>

        <ol className="space-y-4">
          <li className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-shout-surface border border-shout-border rounded flex items-center justify-center font-mono font-bold text-shout-accent">
              1
            </span>
            <span>
              Install the CLI globally with{' '}
              <code className="bg-shout-surface px-1.5 py-0.5 rounded text-sm">
                npm install -g shout-cli
              </code>
            </span>
          </li>
          <li className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-shout-surface border border-shout-border rounded flex items-center justify-center font-mono font-bold text-shout-accent">
              2
            </span>
            <span>
              Authenticate with{' '}
              <code className="bg-shout-surface px-1.5 py-0.5 rounded text-sm">shout login</code>{' '}
              using your GitHub account
            </span>
          </li>
          <li className="flex items-start gap-4">
            <span className="flex-shrink-0 w-8 h-8 bg-shout-surface border border-shout-border rounded flex items-center justify-center font-mono font-bold text-shout-accent">
              3
            </span>
            <span>
              Start broadcasting with{' '}
              <code className="bg-shout-surface px-1.5 py-0.5 rounded text-sm">shout start</code>{' '}
              and share the link
            </span>
          </li>
        </ol>

        <h2 className="text-2xl font-semibold text-shout-text mt-10 mb-4">
          Use cases
        </h2>

        <ul className="space-y-2">
          <li>Pair programming sessions with distributed teams</li>
          <li>Live coding tutorials and workshops</li>
          <li>Debugging sessions with collaborators</li>
          <li>Interview take-home reviews</li>
          <li>Open source contribution streams</li>
          <li>Just showing off your terminal setup</li>
        </ul>

        <div className="mt-12 pt-8 border-t border-shout-border">
          <p className="text-sm">
            Questions or feedback?{' '}
            <Link href="https://github.com/pavanmadiraju91/ideal-robot" className="text-shout-accent hover:underline">
              Open an issue on GitHub
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
