<div align="center">
  <a href="https://shout.run">
    <img src="https://raw.githubusercontent.com/pavanmadiraju91/shout-run/main/packages/web/public/logo.png" alt="shout.run" width="120" />
  </a>
  <h1>shout</h1>
  <p><strong>Live terminal broadcasting for developers</strong></p>
  <p>Broadcast your terminal to the world. Live.</p>
  <p>
    <a href="https://www.npmjs.com/package/shout-run"><img src="https://img.shields.io/npm/v/shout-run" alt="npm version" /></a>
    <a href="https://www.npmjs.com/package/shout-run-sdk"><img src="https://img.shields.io/npm/v/shout-run-sdk?label=sdk" alt="SDK version" /></a>
    <a href="https://pypi.org/project/shout-run-sdk/"><img src="https://img.shields.io/pypi/v/shout-run-sdk?label=python-sdk" alt="PyPI version" /></a>
    <a href="https://github.com/pavanmadiraju91/shout-run/actions/workflows/ci.yml"><img src="https://github.com/pavanmadiraju91/shout-run/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://github.com/pavanmadiraju91/shout-run/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license" /></a>
  </p>
</div>

---

## The Gap

| Tool | What it is | Analogy |
|------|-----------|---------|
| **tmate** | Private terminal sharing for pair programming | Zoom call |
| **asciinema** | Record and replay terminal sessions | YouTube video |
| **shout** | Live public terminal broadcasting | Twitch stream |

**shout** fills the gap between private collaboration and recorded content. Share your terminal with the world in real-time.

## Quick Start

```bash
npm install -g shout-run
shout login
shout
```

That's it. Your terminal is live. Viewers watch at `https://shout.run/<you>/<sessionId>`.

## What you can do

### Interactive broadcasting

Run `shout` with no arguments and it spawns a full PTY shell. Everything you type and see goes out live.

```bash
shout                          # prompts for title and visibility
shout -t "building my app"     # skip the title prompt
shout -v private               # unlisted — link only
```

### Pipe any command

```bash
npm run build | shout
pytest -v | shout
kubectl apply -f deploy.yaml | shout
tail -f /var/log/app.log | shout
```

When stdin is piped, shout detects it automatically. No subcommand needed.

### Environment variable stripping

Sensitive data is protected **before it ever leaves your machine**. The CLI strips 25 known sensitive env var prefixes from the broadcast shell: `AWS_SECRET`, `GITHUB_TOKEN`, `OPENAI_API_KEY`, `STRIPE_SECRET`, `DATABASE_URL`, `JWT_SECRET`, and more.

Even if you run `env` or `printenv` mid-broadcast, those values won't appear. The stripping happens locally before the shell starts, so secrets never reach the network.

### Session visibility

| Visibility | Behavior |
|------------|----------|
| `public` | Listed on the live feed, anyone can watch |
| `followers` | Visible only to your followers |
| `private` | Unlisted, only people with the direct link. Live-only: no replay or export after the session ends |

### Replay and late join

Late joiners receive the last 100 chunks from a ring buffer so they catch up instantly. After a session ends, the full recording is available for replay and can be exported as asciicast v2 (`.cast`) files. Private sessions are live-only — no replay data is stored, and nothing is persisted after the session ends.

### Upvoting and live feed

The homepage shows a HN-style tabbed feed of live and recent sessions, sorted by upvotes. Viewers can upvote sessions anonymously (deduplicated per voter via KV).

### Embeddable player

Embed session replays in blog posts, docs, or READMEs. See the [Embed](#embed) section below.

## SDKs and MCP servers

Beyond the CLI, you can broadcast programmatically from scripts, CI pipelines, and AI agents.

### TypeScript SDK

```bash
npm install shout-run-sdk
```

```typescript
import { ShoutSession } from 'shout-run-sdk';

const session = new ShoutSession({
  apiKey: 'shout_sk_...',
  title: 'My Build',
});

const info = await session.start();
console.log(`Live at: ${info.url}`);

session.write('Hello from the SDK!\r\n');

await session.end();
```

The SDK handles the WebSocket connection, binary framing, buffering, and reconnection. You call `write()` and forget about the rest.

Methods: `start()`, `write(data)`, `resize(cols, rows)`, `end()`
Events: `connected`, `disconnected`, `reconnecting`, `viewers`, `error`, `stateChange`

Full API reference: [`packages/sdk/README.md`](packages/sdk/README.md)

### Python SDK

```bash
pip install shout-run-sdk
```

```python
from shout_sdk import ShoutSession

with ShoutSession(api_key="shout_sk_...") as session:
    info = session.start(title="My Build")
    print(f"Live at: {info['url']}")
    session.write("Hello from Python!\r\n")
    # session.end() called automatically
```

Works as a context manager. Same capabilities as the TypeScript SDK.

Full API reference: [`packages/sdk-python/README.md`](packages/sdk-python/README.md)

### TypeScript MCP server

Lets AI agents (Claude Code, Cursor, Windsurf) broadcast their work. Runs via npx, no global install needed.

Add to your MCP client settings:

```json
{
  "mcpServers": {
    "shout": {
      "command": "npx",
      "args": ["-y", "shout-run-mcp"],
      "env": {
        "SHOUT_API_KEY": "shout_sk_..."
      }
    }
  }
}
```

**Exposed tools:** `shout_start_broadcast`, `shout_write`, `shout_end_broadcast`, `shout_broadcast_status`

Docs: [`packages/mcp/README.md`](packages/mcp/README.md)

### Python MCP server

Same tools, runs with `uvx` (or `pip install shout-run-mcp`).

```json
{
  "mcpServers": {
    "shout": {
      "command": "uvx",
      "args": ["shout-run-mcp"],
      "env": {
        "SHOUT_API_KEY": "shout_sk_..."
      }
    }
  }
}
```

Docs: [`packages/mcp-python/README.md`](packages/mcp-python/README.md)

### Getting an API key

1. Log in at [shout.run](https://shout.run) with GitHub
2. Create a key:

```bash
curl -X POST https://api.shout.run/api/keys \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Agent"}'
```

Save the returned `key`. It's shown only once. Keys start with `shout_sk_`.

## Embed

Embed session replays anywhere with an iframe:

```html
<iframe
  src="https://shout.run/embed/SESSION_ID"
  width="800"
  height="500"
  frameborder="0"
  allowfullscreen
></iframe>
```

### URL parameters

| Param | Default | Description |
|-------|---------|-------------|
| `autoplay` | `1` | Set to `0` to pause on load |
| `speed` | `1` | Playback speed multiplier |
| `t` | `0` | Start time in seconds |
| `controls` | `1` | Set to `0` to hide the player bar |

## CLI reference

```
Usage: shout [options] [command]

Commands:
  broadcast [options]    Start broadcasting your terminal (default)
  login                  Authenticate with GitHub
  logout                 Remove stored credentials
  whoami                 Display current logged-in user
  help [command]         Display help for command

Broadcast options:
  -t, --title <title>            Session title
  -v, --visibility <visibility>  Visibility: public, followers, private
  --tags <tags>                  Comma-separated tags
```

When stdin is piped, `broadcast` is selected automatically.

## Architecture

```
packages/
  shared/       @shout/shared    Types, binary protocol, constants (build first)
  cli/          @shout/cli       Commander.js CLI — published as `shout-run` on npm
  sdk/          @shout/sdk       TypeScript SDK — published as `shout-run-sdk` on npm
  mcp/          @shout/mcp       TypeScript MCP server — published as `shout-run-mcp` on npm
  worker/       @shout/worker    Cloudflare Workers + Durable Objects (Hono, Drizzle, Turso)
  web/          @shout/web       Next.js 15 / React 19 frontend (xterm.js, Zustand)
  sdk-python/                    Python SDK — published as `shout-run-sdk` on PyPI
  mcp-python/                    Python MCP server — published as `shout-run-mcp` on PyPI
```

### Data flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   Your Terminal             Cloudflare Worker              Viewers      │
│                                                                         │
│   ┌───────────┐            ┌─────────────────┐          ┌───────────┐  │
│   │  shout    │── binary ─>│  SessionHub DO  │<─────────│  Next.js  │  │
│   │  CLI/SDK  │   frames   │  (fan-out hub)  │  binary  │  + xterm  │  │
│   └───────────┘            └────────┬────────┘  frames  └───────────┘  │
│       │                             │                        │         │
│   env-var stripping         Turso DB (sessions,        real-time       │
│   + binary encoding         users, follows)            decoding        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

1. The CLI or SDK captures terminal output (PTY for interactive, stdin for piped, `write()` for programmatic)
2. Sensitive environment variables are stripped from the broadcast shell (CLI only)
3. Data is encoded into a compact binary frame protocol and sent over WebSocket
4. A Cloudflare Durable Object (SessionHub) fans out frames to all connected viewers
5. The Next.js web app decodes frames and renders them into an xterm.js terminal

### Binary WebSocket protocol

Every frame: `[type: 1 byte][timestamp: 4 bytes uint32][payload: variable]`

| Frame type | Byte | Description |
|------------|------|-------------|
| Output | `0x01` | Terminal output data |
| Meta | `0x02` | Session metadata |
| ViewerCount | `0x03` | Current viewer count |
| End | `0x04` | Session ended |
| Ping | `0x05` | Keepalive ping |
| Pong | `0x06` | Keepalive pong |
| Error | `0x07` | Error message |
| Resize | `0x08` | Terminal dimensions changed |

### Key internals

- **SessionHub Durable Object**: one instance per broadcast session. Accepts a single broadcaster WebSocket and many viewer WebSockets (using the hibernation API). Maintains a 100-chunk ring buffer for late joiners. Alarm-based heartbeat pings the broadcaster every 30 seconds; 60 seconds of silence triggers cleanup.
- **Three-tier replay storage**: during a live session, chunks accumulate in DO memory (capped at 50 MB). On session end, they're flushed to DO storage, then persisted to R2 as JSON. Replay requests follow a DO memory -> DO storage -> R2 fallback chain, so replays survive hibernation and eviction.
- **Authentication**: GitHub device flow routed through the worker (`/api/auth/device-code`, `/api/auth/token`). The worker exchanges the code for a GitHub token, creates or finds the user, and returns a JWT. The CLI stores credentials via keytar (OS keychain) with a fallback to `~/.shout/config.json`. SDK/MCP clients authenticate with API keys (`shout_sk_...`).
- **Rate limiting**: bytes-per-second throttling (100 KB/s default) in both the CLI and Durable Object. Database-backed daily session limits per user. KV-backed vote deduplication. Large output is chunked into 64 KB WebSocket messages to stay under Cloudflare's 1 MB frame limit.

## Self-Hosting

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 9
- A [Cloudflare](https://cloudflare.com/) account (Workers free tier works)
- A [Turso](https://turso.tech/) database
- A [GitHub OAuth App](https://github.com/settings/developers)
- A [Vercel](https://vercel.com/) account (for the web app)

### 1. Clone and install

```bash
git clone https://github.com/pavanmadiraju91/shout-run.git
cd shout-run
pnpm install
```

### 2. Set up Turso

```bash
turso db create shout
turso db tokens create shout
```

### 3. Create a GitHub OAuth App

Go to [GitHub Developer Settings](https://github.com/settings/developers) and create a new OAuth App. Note the Client ID and Client Secret.

### 4. Configure environment

```bash
cp .env.example .env
```

Fill in the values:

| Variable | Description |
|----------|-------------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `TURSO_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `JWT_SECRET` | Random secret (`openssl rand -hex 32`) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token |
| `NEXT_PUBLIC_API_URL` | Public URL of your deployed worker |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL of your deployed worker |

### 5. Set worker secrets

```bash
cd packages/worker
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put JWT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

### 6. Deploy the worker

```bash
pnpm --filter @shout/worker deploy
```

### 7. Deploy the web app

```bash
cd packages/web
vercel deploy --prod
```

## Development

```bash
pnpm install          # install all deps
pnpm dev              # run all dev servers in parallel
pnpm build            # build all packages (Turborepo handles ordering)
pnpm lint             # lint all packages
pnpm typecheck        # type-check all packages
pnpm clean            # remove all dist/node_modules
```

Build individual packages with `--filter`:

```bash
pnpm --filter @shout/shared build    # types + protocol (build first)
pnpm --filter @shout/cli build       # CLI (tsup, inlines shared)
pnpm --filter @shout/sdk build       # TypeScript SDK (tsup)
pnpm --filter @shout/mcp build       # TypeScript MCP server (tsup, needs sdk)
pnpm --filter @shout/worker dev      # Cloudflare Worker dev server
pnpm --filter @shout/web dev         # Next.js dev server on :3000
```

Python packages:

```bash
cd packages/sdk-python && python -m build
cd packages/mcp-python && python -m build
```

## Packages

| Package | Registry | Install |
|---------|----------|---------|
| [`shout-run`](https://www.npmjs.com/package/shout-run) | npm | `npm i -g shout-run` |
| [`shout-run-sdk`](https://www.npmjs.com/package/shout-run-sdk) | npm | `npm i shout-run-sdk` |
| [`shout-run-mcp`](https://www.npmjs.com/package/shout-run-mcp) | npm | `npx shout-run-mcp` |
| [`shout-run-sdk`](https://pypi.org/project/shout-run-sdk/) | PyPI | `pip install shout-run-sdk` |
| [`shout-run-mcp`](https://pypi.org/project/shout-run-mcp/) | PyPI | `pip install shout-run-mcp` |

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built with <a href="https://workers.cloudflare.com/">Cloudflare Workers</a>, <a href="https://turso.tech/">Turso</a>, <a href="https://nextjs.org/">Next.js</a>, and <a href="https://xtermjs.org/">xterm.js</a></p>
  <p>
    <a href="https://shout.run">Website</a> &middot;
    <a href="https://github.com/pavanmadiraju91/shout-run/issues">Issues</a>
  </p>
</div>
