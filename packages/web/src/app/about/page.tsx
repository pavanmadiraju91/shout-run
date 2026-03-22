import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { CopyButton } from '@/components/CopyButton';

export const metadata: Metadata = {
  title: 'Docs - shout',
  description:
    'Documentation for shout — CLI installation, SDKs, MCP servers, embedding, and API reference.',
  alternates: {
    canonical: '/about',
  },
};

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-shout-surface px-1.5 py-0.5 rounded text-[13px] font-mono text-shout-text">
      {children}
    </code>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="bg-shout-surface rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-shout-border/40">
        <span className="text-[11px] font-mono text-shout-muted uppercase tracking-wider">
          {label}
        </span>
        <CopyButton text={code} size="small" />
      </div>
      <pre className="p-4 text-[13px] font-mono text-shout-text overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

const NAV = [
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'features', label: 'Features' },
  { id: 'sdks', label: 'SDKs' },
  { id: 'mcp', label: 'MCP Servers' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'embedding', label: 'Embedding' },
  { id: 'open-source', label: 'Open Source' },
  { id: 'faq', label: 'FAQ' },
];

export default function AboutPage() {
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* ── Hero ──────────────────────────────────────── */}
        <section className="pt-16 sm:pt-20 pb-6">
          <h1 className="text-3xl font-bold tracking-tight mb-3">
            About <span className="text-shout-green">shout</span>
          </h1>
          <p className="text-shout-muted leading-relaxed">
            Broadcast your terminal to anyone with a browser. Install the CLI, run{' '}
            <Code>shout</Code>, share the link.
          </p>
        </section>

        {/* ── Nav ───────────────────────────────────────── */}
        <nav className="flex flex-wrap gap-x-5 gap-y-1.5 border-b border-shout-border pb-4 mb-14 text-sm">
          {NAV.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="text-shout-muted hover:text-shout-text transition-colors"
            >
              {s.label}
            </a>
          ))}
        </nav>

        {/* ── Quick Start ──────────────────────────────── */}
        <section id="quick-start" className="mb-16 scroll-mt-20">
          <h2 className="text-xl font-semibold text-shout-text mb-6">Quick Start</h2>

          <div className="space-y-6">
            <div>
              <p className="text-sm text-shout-muted mb-2">1. Install the CLI</p>
              <CodeBlock label="shell" code="npm install -g shout-run" />
            </div>
            <div>
              <p className="text-sm text-shout-muted mb-2">2. Log in with GitHub</p>
              <CodeBlock label="shell" code="shout login" />
            </div>
            <div>
              <p className="text-sm text-shout-muted mb-2">3. Start broadcasting</p>
              <CodeBlock label="shell" code="shout" />
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-shout-muted leading-relaxed">
            <p>
              Options: <Code>--title &quot;My session&quot;</Code>{' '}
              <Code>--visibility public</Code> <Code>--tags rust,cli</Code>
            </p>
            <p>Pipe mode works too:</p>
          </div>
          <div className="mt-2">
            <CodeBlock label="shell" code={'./deploy.sh | shout --title "Deploy log"'} />
          </div>
        </section>

        {/* ── Features ─────────────────────────────────── */}
        <section id="features" className="mb-16 scroll-mt-20">
          <h2 className="text-xl font-semibold text-shout-text mb-6">Features</h2>

          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-5">
            {(
              [
                [
                  'Real-time streaming',
                  'Terminal output reaches viewers over WebSocket with no perceptible delay.',
                ],
                [
                  'Late-joiner catch-up',
                  "Viewers who arrive mid-session get a buffer of recent output so they're not lost.",
                ],
                [
                  'Session replay',
                  'Ended sessions become recordings you can scrub through like a video.',
                ],
                [
                  'Export as .cast',
                  'Download any session as an asciicast v2 file. Compatible with asciinema-player.',
                ],
                [
                  'Embeddable player',
                  'Drop an iframe on any page. oEmbed support for platforms that auto-embed.',
                ],
                [
                  'Privacy controls',
                  'Public or private. Private sessions leave no replay data.',
                ],
              ] as const
            ).map(([title, desc]) => (
              <div key={title}>
                <p className="text-sm font-medium text-shout-text">{title}</p>
                <p className="text-sm text-shout-muted mt-0.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SDKs ─────────────────────────────────────── */}
        <section id="sdks" className="mb-16 scroll-mt-20">
          <h2 className="text-xl font-semibold text-shout-text mb-3">SDKs</h2>
          <p className="text-sm text-shout-muted mb-6 leading-relaxed">
            Broadcast from your own code instead of the CLI. Available for TypeScript and Python.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-mono text-shout-muted mb-2 uppercase tracking-wider">
                TypeScript
              </p>
              <CodeBlock label="shell" code="npm install shout-run-sdk" />
              <div className="mt-3">
                <CodeBlock
                  label="typescript"
                  code={`import { ShoutSession } from 'shout-run-sdk';

const session = new ShoutSession({
  apiKey: 'shout_sk_...',
});

const info = await session.start();
session.write('Hello, world!\\r\\n');
await session.end();`}
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-mono text-shout-muted mb-2 uppercase tracking-wider">
                Python
              </p>
              <CodeBlock label="shell" code="pip install shout-run-sdk" />
              <div className="mt-3">
                <CodeBlock
                  label="python"
                  code={`from shout_sdk import ShoutSession

session = ShoutSession(api_key='shout_sk_...')

info = session.start()
session.write('Hello, world!\\r\\n')
session.end()`}
                />
              </div>
            </div>
          </div>

          <p className="text-sm text-shout-muted mt-6 leading-relaxed">
            Both SDKs expose the same core methods: <Code>start()</Code>, <Code>write()</Code>,{' '}
            <Code>resize()</Code>, and <Code>end()</Code>.
          </p>
        </section>

        {/* ── MCP Servers ──────────────────────────────── */}
        <section id="mcp" className="mb-16 scroll-mt-20">
          <h2 className="text-xl font-semibold text-shout-text mb-3">MCP Servers</h2>
          <p className="text-sm text-shout-muted mb-6 leading-relaxed">
            Let AI agents broadcast terminal sessions through the{' '}
            <a
              href="https://modelcontextprotocol.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shout-accent hover:underline"
            >
              Model Context Protocol
            </a>
            . Add to your Claude Desktop config:
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-mono text-shout-muted mb-2 uppercase tracking-wider">
                TypeScript
              </p>
              <CodeBlock
                label="json"
                code={`{
  "mcpServers": {
    "shout": {
      "command": "npx",
      "args": ["shout-run-mcp"],
      "env": {
        "SHOUT_API_KEY": "shout_sk_..."
      }
    }
  }
}`}
              />
            </div>
            <div>
              <p className="text-xs font-mono text-shout-muted mb-2 uppercase tracking-wider">
                Python
              </p>
              <CodeBlock
                label="json"
                code={`{
  "mcpServers": {
    "shout": {
      "command": "shout-mcp",
      "env": {
        "SHOUT_API_KEY": "shout_sk_..."
      }
    }
  }
}`}
              />
            </div>
          </div>

          <h3 className="text-base font-medium text-shout-text mt-8 mb-4">Available tools</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-shout-border text-left">
                  <th className="py-2 pr-6 font-medium text-shout-text">Tool</th>
                  <th className="py-2 font-medium text-shout-text">Description</th>
                </tr>
              </thead>
              <tbody className="text-shout-muted">
                {(
                  [
                    ['shout_start_broadcast', 'Start a broadcast session, returns the viewer URL'],
                    [
                      'shout_write',
                      'Send terminal output to viewers (supports ANSI escape codes)',
                    ],
                    ['shout_end_broadcast', 'End the current session'],
                    ['shout_broadcast_status', 'Check session status and current viewer count'],
                    ['shout_delete_session', 'Delete a session that has ended'],
                    ['shout_search_sessions', 'Search sessions by title, tags, or status'],
                    ['shout_read_session', 'Read the plain-text transcript of a session'],
                  ] as const
                ).map(([tool, desc]) => (
                  <tr key={tool} className="border-b border-shout-border/40">
                    <td className="py-2.5 pr-6 font-mono text-[13px] text-shout-text whitespace-nowrap">
                      {tool}
                    </td>
                    <td className="py-2.5">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── API Keys ─────────────────────────────────── */}
        <section id="api-keys" className="mb-16 scroll-mt-20">
          <h2 className="text-xl font-semibold text-shout-text mb-3">API Keys</h2>
          <p className="text-sm text-shout-muted mb-4 leading-relaxed">
            SDKs and MCP servers authenticate with API keys. Create one from the CLI:
          </p>
          <CodeBlock label="shell" code={'shout api-key create "My Agent"'} />
          <p className="text-sm text-shout-muted mt-4 leading-relaxed">
            Manage keys with <Code>shout api-key list</Code> and{' '}
            <Code>{'shout api-key revoke <id>'}</Code>.
          </p>
        </section>

        {/* ── Embedding ────────────────────────────────── */}
        <section id="embedding" className="mb-16 scroll-mt-20">
          <h2 className="text-xl font-semibold text-shout-text mb-3">Embedding</h2>
          <p className="text-sm text-shout-muted mb-4 leading-relaxed">
            Embed a session replay on any page with an iframe:
          </p>
          <CodeBlock
            label="html"
            code={`<iframe
  src="https://shout.run/embed/SESSION_ID"
  width="800"
  height="500"
  frameborder="0"
  allowfullscreen
></iframe>`}
          />

          <h3 className="text-base font-medium text-shout-text mt-8 mb-4">URL parameters</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-shout-border text-left">
                  <th className="py-2 pr-6 font-medium text-shout-text">Param</th>
                  <th className="py-2 pr-6 font-medium text-shout-text">Default</th>
                  <th className="py-2 font-medium text-shout-text">Description</th>
                </tr>
              </thead>
              <tbody className="text-shout-muted">
                {(
                  [
                    ['autoplay', '1', 'Set to 0 to start paused'],
                    ['speed', '1', 'Playback speed multiplier (e.g. 2 for double speed)'],
                    ['t', '0', 'Start time in seconds'],
                    ['controls', '1', 'Set to 0 to hide the player bar'],
                  ] as const
                ).map(([param, def, desc]) => (
                  <tr key={param} className="border-b border-shout-border/40">
                    <td className="py-2.5 pr-6 font-mono text-[13px] text-shout-text">{param}</td>
                    <td className="py-2.5 pr-6 font-mono text-[13px]">{def}</td>
                    <td className="py-2.5">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-shout-muted mt-4 leading-relaxed">
            Platforms that support oEmbed will auto-embed the player when you paste a shout.run
            link.
          </p>
        </section>

        {/* ── Open Source ──────────────────────────────── */}
        <section id="open-source" className="mb-16 scroll-mt-20">
          <h2 className="text-xl font-semibold text-shout-text mb-3">Open Source</h2>
          <p className="text-sm text-shout-muted leading-relaxed">
            Everything is MIT-licensed — the CLI, the worker, the web app, the SDKs, all of it.
            Source and contributions:{' '}
            <a
              href="https://github.com/pavanmadiraju91/shout-run"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shout-accent hover:underline"
            >
              github.com/pavanmadiraju91/shout-run
            </a>
            .
          </p>
        </section>

        {/* ── FAQ ─────────────────────────────────────── */}
        <section id="faq" className="mb-16 scroll-mt-20">
          <h2 className="text-xl font-semibold text-shout-text mb-6">Frequently Asked Questions</h2>

          <div className="space-y-6">
            {(
              [
                [
                  'What is shout?',
                  'shout is an open-source terminal broadcasting tool. It lets developers stream their terminal output in real time to anyone with a browser, record sessions for replay, and embed recordings on any web page.',
                ],
                [
                  'How does shout work?',
                  'The CLI captures your terminal output via a pseudo-terminal (PTY), encodes it into a compact binary WebSocket protocol, and streams it through a Cloudflare Worker to viewers running xterm.js in the browser. Late joiners receive a terminal state snapshot so they see the current screen immediately.',
                ],
                [
                  'Is shout free?',
                  'Yes. shout is completely free and open-source under the MIT license. There are no paid tiers, usage fees, or premium features.',
                ],
                [
                  'What terminals are supported?',
                  'shout works with any terminal emulator on Linux, macOS, and Windows. It captures output from your default shell (bash, zsh, fish, PowerShell, etc.) via PTY.',
                ],
                [
                  'How long can a session last?',
                  'Sessions can last up to 4 hours. Output is rate-limited to 100 KB/s to ensure a smooth experience for viewers. There is a daily cap of 50 sessions per user.',
                ],
                [
                  'Is my data private?',
                  'You control session visibility: public or private. Private sessions leave no replay data on the server.',
                ],
                [
                  'Can AI agents use shout?',
                  'Yes. TypeScript and Python SDKs let you broadcast programmatically, and MCP servers (compatible with Claude, Cursor, and other MCP clients) expose tools like shout_start_broadcast, shout_write, shout_search_sessions, and shout_read_session.',
                ],
                [
                  'How do I embed a session?',
                  'Use an iframe pointing to https://shout.run/embed/SESSION_ID. URL parameters control autoplay, playback speed, start time, and whether the player bar is visible. Platforms that support oEmbed will auto-embed the player when you paste a shout.run link.',
                ],
              ] as const
            ).map(([q, a]) => (
              <div key={q}>
                <h3 className="text-sm font-medium text-shout-text mb-1">{q}</h3>
                <p className="text-sm text-shout-muted leading-relaxed">{a}</p>
              </div>
            ))}
          </div>

          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  {
                    '@type': 'Question',
                    name: 'What is shout?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'shout is an open-source terminal broadcasting tool. It lets developers stream their terminal output in real time to anyone with a browser, record sessions for replay, and embed recordings on any web page.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'How does shout work?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'The CLI captures your terminal output via a pseudo-terminal (PTY), encodes it into a compact binary WebSocket protocol, and streams it through a Cloudflare Worker to viewers running xterm.js in the browser. Late joiners receive a terminal state snapshot so they see the current screen immediately.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Is shout free?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes. shout is completely free and open-source under the MIT license. There are no paid tiers, usage fees, or premium features.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'What terminals are supported?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'shout works with any terminal emulator on Linux, macOS, and Windows. It captures output from your default shell (bash, zsh, fish, PowerShell, etc.) via PTY.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'How long can a session last?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Sessions can last up to 4 hours. Output is rate-limited to 100 KB/s to ensure a smooth experience for viewers. There is a daily cap of 50 sessions per user.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Is my data private?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'You control session visibility: public or private. Private sessions leave no replay data on the server.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'Can AI agents use shout?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Yes. TypeScript and Python SDKs let you broadcast programmatically, and MCP servers expose tools like shout_start_broadcast, shout_write, shout_search_sessions, and shout_read_session.',
                    },
                  },
                  {
                    '@type': 'Question',
                    name: 'How do I embed a session?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'Use an iframe pointing to https://shout.run/embed/SESSION_ID. URL parameters control autoplay, playback speed, start time, and whether the player bar is visible. Platforms that support oEmbed will auto-embed the player when you paste a shout.run link.',
                    },
                  },
                ],
              }),
            }}
          />
        </section>
      </div>

      <Footer />
    </>
  );
}
