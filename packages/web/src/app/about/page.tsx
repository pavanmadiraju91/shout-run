import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'About - shout',
  description:
    'shout is a live terminal broadcasting platform. Stream your terminal, watch developers code, and embed sessions anywhere.',
};

export default function AboutPage() {
  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <section className="py-16 sm:py-20">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            About <span className="text-shout-green">shout</span>
          </h1>
          <p className="text-lg sm:text-xl text-shout-muted max-w-2xl leading-relaxed">
            Live terminal broadcasting for developers. Stream your terminal to the world, let others
            watch in real-time, and replay sessions later.
          </p>
        </section>

        {/* The Gap */}
        <section className="pb-16">
          <h2 className="text-xl font-semibold mb-6">The gap we fill</h2>
          <div className="overflow-x-auto border border-shout-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-shout-surface">
                  <th className="text-left py-3 px-4 font-medium text-shout-muted">Feature</th>
                  <th className="text-center py-3 px-4 font-medium text-shout-muted">tmate</th>
                  <th className="text-center py-3 px-4 font-medium text-shout-muted">asciinema</th>
                  <th className="text-center py-3 px-4 font-medium text-shout-green">shout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-shout-border">
                <tr>
                  <td className="py-3 px-4 text-shout-text">Live streaming</td>
                  <td className="py-3 px-4 text-center text-shout-green">Yes</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-green font-medium">Yes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-shout-text">Web viewer (no install)</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-green">Yes</td>
                  <td className="py-3 px-4 text-center text-shout-green font-medium">Yes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-shout-text">Replay &amp; late join</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-green">Yes</td>
                  <td className="py-3 px-4 text-center text-shout-green font-medium">Yes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-shout-text">Secret redaction</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-green font-medium">Yes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-shout-text">Embeddable player</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-green">Yes</td>
                  <td className="py-3 px-4 text-center text-shout-green font-medium">Yes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-shout-text">SDK / API access</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-green font-medium">Yes</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 text-shout-text">MCP server (AI agents)</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-muted">No</td>
                  <td className="py-3 px-4 text-center text-shout-green font-medium">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* How it works */}
        <section className="pb-16">
          <h2 className="text-xl font-semibold mb-6">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-shout-border border border-shout-border rounded-lg overflow-hidden">
            <div className="bg-shout-bg p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">
                  1
                </span>
                <span className="text-sm font-medium text-shout-text">Install</span>
              </div>
              <code className="block bg-shout-surface border border-shout-border rounded px-3 py-2 font-mono text-xs text-shout-text">
                <span className="text-shout-green">$</span> npm i -g shout-run
              </code>
            </div>
            <div className="bg-shout-bg p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">
                  2
                </span>
                <span className="text-sm font-medium text-shout-text">Broadcast</span>
              </div>
              <code className="block bg-shout-surface border border-shout-border rounded px-3 py-2 font-mono text-xs text-shout-text">
                <span className="text-shout-green">$</span> shout
              </code>
            </div>
            <div className="bg-shout-bg p-5">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="flex items-center justify-center w-6 h-6 rounded bg-shout-green/15 text-shout-green text-xs font-bold font-mono">
                  3
                </span>
                <span className="text-sm font-medium text-shout-text">Share</span>
              </div>
              <div className="bg-shout-surface border border-shout-border rounded px-3 py-2 font-mono text-xs text-shout-text">
                shout.run/<span className="text-shout-accent">you</span>/abc123
              </div>
            </div>
          </div>
          <p className="text-sm text-shout-muted mt-4">
            The CLI captures PTY output, redacts secrets, encodes binary frames, and streams them over
            WebSocket. Viewers connect instantly through the web — no installs, no accounts.
          </p>
        </section>

        {/* Features grid */}
        <section className="pb-16">
          <h2 className="text-xl font-semibold mb-6">Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              }
              title="Secret stripping"
              description="25 categories of env vars (AWS_SECRET, GITHUB_TOKEN, OPENAI_API_KEY, etc.) are stripped before the shell spawns."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              }
              title="Session visibility"
              description="Public or unlisted sessions. Live feed with upvoting. Profile pages for every broadcaster."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              }
              title="Replay & late join"
              description="Late viewers see a catch-up buffer. Ended sessions replay with full seek controls. Export as .cast files."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                  />
                </svg>
              }
              title="Embeddable player"
              description="Drop a session into any page with an iframe. Supports oEmbed for auto-discovery."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              }
              title="SDKs (TypeScript & Python)"
              description="Broadcast programmatically from scripts, CI/CD, notebooks. Full API key auth."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
              title="MCP servers"
              description="Let AI agents broadcast terminal sessions. Available for TypeScript and Python."
            />
          </div>
        </section>

        {/* Packages */}
        <section className="pb-16">
          <h2 className="text-xl font-semibold mb-6">Packages</h2>
          <div className="overflow-x-auto border border-shout-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-shout-surface">
                  <th className="text-left py-3 px-4 font-medium text-shout-muted">Package</th>
                  <th className="text-left py-3 px-4 font-medium text-shout-muted">Registry</th>
                  <th className="text-left py-3 px-4 font-medium text-shout-muted">Install</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-shout-border">
                <PackageRow
                  name="shout-run"
                  description="CLI"
                  registry="npm"
                  registryUrl="https://www.npmjs.com/package/shout-run"
                  install="npm i -g shout-run"
                />
                <PackageRow
                  name="shout-run-sdk"
                  description="TypeScript SDK"
                  registry="npm"
                  registryUrl="https://www.npmjs.com/package/shout-run-sdk"
                  install="npm i shout-run-sdk"
                />
                <PackageRow
                  name="shout-run-mcp"
                  description="TypeScript MCP"
                  registry="npm"
                  registryUrl="https://www.npmjs.com/package/shout-run-mcp"
                  install="npm i shout-run-mcp"
                />
                <PackageRow
                  name="shout-run-sdk"
                  description="Python SDK"
                  registry="PyPI"
                  registryUrl="https://pypi.org/project/shout-run-sdk/"
                  install="pip install shout-run-sdk"
                />
                <PackageRow
                  name="shout-run-mcp"
                  description="Python MCP"
                  registry="PyPI"
                  registryUrl="https://pypi.org/project/shout-run-mcp/"
                  install="pip install shout-run-mcp"
                />
              </tbody>
            </table>
          </div>
        </section>

        {/* Open source */}
        <section className="pb-16">
          <div className="bg-shout-surface border border-shout-border rounded-lg p-6 sm:p-8 text-center">
            <svg
              className="w-8 h-8 mx-auto mb-4 text-shout-muted"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            <h3 className="text-lg font-semibold mb-2">Open source</h3>
            <p className="text-sm text-shout-muted mb-4 max-w-md mx-auto">
              shout is MIT-licensed and built in public. Contributions, bug reports, and feedback are
              welcome.
            </p>
            <a
              href="https://github.com/pavanmadiraju91/shout-run"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-shout-surface-hover border border-shout-border rounded-lg px-5 py-2.5 text-sm font-medium text-shout-text hover:border-shout-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </section>
      </div>

      <Footer />
    </>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-shout-surface border border-shout-border rounded-lg p-5">
      <div className="flex items-center gap-3 mb-2.5">
        <span className="text-shout-green">{icon}</span>
        <h3 className="text-sm font-semibold text-shout-text">{title}</h3>
      </div>
      <p className="text-sm text-shout-muted leading-relaxed">{description}</p>
    </div>
  );
}

function PackageRow({
  name,
  description,
  registry,
  registryUrl,
  install,
}: {
  name: string;
  description: string;
  registry: string;
  registryUrl: string;
  install: string;
}) {
  return (
    <tr>
      <td className="py-3 px-4">
        <div className="flex items-baseline gap-2">
          <a
            href={registryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-shout-accent hover:underline"
          >
            {name}
          </a>
          <span className="text-shout-muted text-xs">{description}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-shout-muted">{registry}</td>
      <td className="py-3 px-4">
        <code className="bg-shout-bg px-2 py-1 rounded text-xs font-mono text-shout-text">
          {install}
        </code>
      </td>
    </tr>
  );
}
