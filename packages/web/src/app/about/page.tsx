import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'About - shout',
  description: 'shout is a live terminal broadcasting tool. Install the CLI, run shout, share the link.',
};

export default function AboutPage() {
  return (
    <>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8">
          About <span className="text-shout-green">shout</span>
        </h1>

        <div className="space-y-6 text-shout-muted leading-relaxed">
          <p>
            shout lets you broadcast your terminal to anyone with a browser. You install a CLI, run{' '}
            <code className="bg-shout-surface px-1.5 py-0.5 rounded text-sm text-shout-text">shout</code>,
            and get a link. People click the link and watch your terminal in real time. That&apos;s it.
          </p>

          <p>
            If someone shows up late, they get a catch-up buffer so they&apos;re not lost. After
            the session ends, it becomes a replay anyone can scrub through. You can also export it
            as a <code className="bg-shout-surface px-1.5 py-0.5 rounded text-sm text-shout-text">.cast</code> file.
          </p>

          <p>
            The CLI strips 25 categories of environment variables (API keys, tokens, database URLs)
            before the broadcast shell even starts. It&apos;s not foolproof, but it catches the common
            stuff so you&apos;re less likely to leak a secret on stream.
          </p>

          <h2 className="text-lg font-semibold text-shout-text pt-4">Beyond the CLI</h2>

          <p>
            There are also SDKs if you want to broadcast from your own code. TypeScript
            and Python. Same for MCP servers, if you want AI agents to broadcast sessions.
            All available on{' '}
            <a
              href="https://www.npmjs.com/search?q=shout-run"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shout-accent hover:underline"
            >
              npm
            </a>{' '}
            and{' '}
            <a
              href="https://pypi.org/search/?q=shout-run"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shout-accent hover:underline"
            >
              PyPI
            </a>.
          </p>

          <p>
            Sessions can be embedded in other pages with an iframe. There&apos;s oEmbed support too, so
            platforms that understand oEmbed auto-embed the player.
          </p>

          <h2 className="text-lg font-semibold text-shout-text pt-4">Open source</h2>

          <p>
            The whole thing is MIT-licensed. CLI, worker, web app, SDKs, everything.
            If you want to poke around or contribute:{' '}
            <a
              href="https://github.com/pavanmadiraju91/shout-run"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shout-accent hover:underline"
            >
              github.com/pavanmadiraju91/shout-run
            </a>.
          </p>
        </div>
      </div>

      <Footer />
    </>
  );
}
