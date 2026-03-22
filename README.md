# shout

Live terminal broadcasting. Stream your terminal to the web, share replays, embed sessions.

[![npm](https://img.shields.io/npm/v/shout-run)](https://www.npmjs.com/package/shout-run)
[![SDK](https://img.shields.io/npm/v/shout-run-sdk?label=sdk)](https://www.npmjs.com/package/shout-run-sdk)
[![Python SDK](https://img.shields.io/pypi/v/shout-run-sdk?label=python-sdk)](https://pypi.org/project/shout-run-sdk/)
[![CI](https://github.com/pavanmadiraju91/shout-run/actions/workflows/ci.yml/badge.svg)](https://github.com/pavanmadiraju91/shout-run/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## What is this

**shout** broadcasts your terminal session over the web in real time. Viewers watch in a browser — no installs, no screen sharing, no latency from video encoding. When the session ends, the recording is available for replay and export.

Think of it like Twitch for your terminal. [tmate](https://tmate.io/) is for private pair programming, [asciinema](https://asciinema.org/) is for recorded demos — shout is for live public broadcasting with an audience.

Website: [shout.run](https://shout.run)

## Quick start

```bash
npm install -g shout-run
shout login
shout
```

Your terminal is now live. Viewers watch at `shout.run/<you>/<sessionId>`.

## Usage

### Interactive mode

Running `shout` with no arguments spawns a PTY shell. Everything you type and see goes out live.

```bash
shout                          # prompts for title and visibility
shout -t "building my app"     # skip the title prompt
shout -v private               # unlisted session, link-only access
```

### Pipe mode

When stdin is piped, shout detects it and broadcasts the output directly.

```bash
npm run build | shout
pytest -v | shout
tail -f /var/log/app.log | shout
```

### Session visibility

| Visibility | What happens |
|------------|-------------|
| `public` | Listed on the feed, anyone can watch |
| `followers` | Only your followers see it |
| `private` | Unlisted. Live-only — no replay after it ends |

### Replay

After a session ends, the full recording is available for replay at the same URL. Late joiners during a live session receive a terminal state snapshot so they see the current screen immediately. Private sessions don't store replay data.

### Embed

Drop a session into a blog post, docs page, or README:

```html
<iframe
  src="https://shout.run/embed/SESSION_ID"
  width="800" height="500"
  frameborder="0" allowfullscreen>
</iframe>
```

| Param | Default | What it does |
|-------|---------|-------------|
| `autoplay` | `1` | `0` to pause on load |
| `speed` | `1` | Playback speed multiplier |
| `t` | `0` | Start time in seconds |
| `controls` | `1` | `0` to hide the player bar |

## SDKs

Broadcast programmatically from scripts, CI pipelines, or AI agents.

### TypeScript

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

Full reference: [`packages/sdk/README.md`](packages/sdk/README.md)

### Python

```bash
pip install shout-run-sdk
```

```python
from shout_sdk import ShoutSession

with ShoutSession(api_key="shout_sk_...") as session:
    info = session.start(title="My Build")
    print(f"Live at: {info['url']}")
    session.write("Hello from Python!\r\n")
```

Full reference: [`packages/sdk-python/README.md`](packages/sdk-python/README.md)

## MCP servers

Let AI agents (Claude Code, Cursor, Windsurf) broadcast their terminal work. Available in TypeScript and Python.

### TypeScript MCP

```json
{
  "mcpServers": {
    "shout": {
      "command": "npx",
      "args": ["-y", "shout-run-mcp"],
      "env": { "SHOUT_API_KEY": "shout_sk_..." }
    }
  }
}
```

### Python MCP

```json
{
  "mcpServers": {
    "shout": {
      "command": "uvx",
      "args": ["shout-run-mcp"],
      "env": { "SHOUT_API_KEY": "shout_sk_..." }
    }
  }
}
```

Exposed tools: `shout_start_broadcast`, `shout_write`, `shout_end_broadcast`, `shout_broadcast_status`, `shout_delete_session`

Docs: [`packages/mcp/README.md`](packages/mcp/README.md) and [`packages/mcp-python/README.md`](packages/mcp-python/README.md)

### API keys

```bash
shout login
shout api-key create "My Agent"
```

Keys start with `shout_sk_`. List with `shout api-key list`, revoke with `shout api-key revoke <id>`.

## CLI reference

```
Usage: shout [options] [command]

Commands:
  broadcast [options]    Start broadcasting (default command)
  login                  Authenticate with GitHub
  logout                 Remove stored credentials
  whoami                 Show current user
  api-key                Manage API keys
  help [command]         Display help

Broadcast options:
  -t, --title <title>            Session title
  -v, --visibility <visibility>  public, followers, or private
  --tags <tags>                  Comma-separated tags
```

## Architecture

```
packages/
  shared/       Types, binary protocol, constants (build first)
  cli/          CLI tool — published as shout-run on npm
  sdk/          TypeScript SDK — shout-run-sdk on npm
  mcp/          TypeScript MCP server — shout-run-mcp on npm
  worker/       Cloudflare Workers + Durable Objects backend
  web/          Next.js 15 / React 19 frontend
  sdk-python/   Python SDK — shout-run-sdk on PyPI
  mcp-python/   Python MCP server — shout-run-mcp on PyPI
  vt-wasm/      Rust WASM terminal parser (late-join snapshots)
```

### How data flows

The CLI captures terminal output from a PTY, encodes it into a compact binary frame protocol, and sends it over WebSocket to a Cloudflare Worker. A Durable Object (SessionHub) fans the frames out to all connected viewer WebSockets. The Next.js frontend decodes frames and renders them into an xterm.js terminal.

SDKs and MCP servers do the same thing programmatically.

### Binary protocol

Every WebSocket message: `[type: 1 byte][timestamp: 4 bytes][payload: variable]`

| Type | Byte | Purpose |
|------|------|---------|
| Output | `0x01` | Terminal output data |
| Meta | `0x02` | Session metadata |
| ViewerCount | `0x03` | Current viewer count |
| End | `0x04` | Session ended |
| Ping | `0x05` | Keepalive |
| Pong | `0x06` | Keepalive response |
| Error | `0x07` | Error message |
| Resize | `0x08` | Terminal dimensions changed |
| Snapshot | `0x09` | Terminal state for late joiners |

### Replay storage

During a live session, binary frames accumulate in DO memory (`pendingChunks`). Every 30 seconds, an alarm flushes them to R2 as numbered part files. On session end, parts are consolidated into a single `replay.json` with a `manifest.json` index. Replay requests read from R2 with a DO storage fallback for older sessions.

Export produces asciicast v2 `.cast` files (NDJSON format).

### Security

The CLI strips 26 sensitive environment variable prefixes before spawning the broadcast shell — things like `AWS_SECRET`, `GITHUB_TOKEN`, `OPENAI_API_KEY`, `STRIPE_SECRET`, and others. The spawned shell gets a clean environment with `SHOUT_SESSION=1` set.

Bytes-per-second throttling (100 KB/s) runs in both the CLI and the Durable Object. Sessions are capped at 4 hours and 50 per user per day.

## Self-hosting

### Prerequisites

- Node.js >= 20, pnpm >= 9
- A Cloudflare account (Workers free tier works)
- A Turso database
- A GitHub OAuth App
- Vercel (for the web frontend)

### Setup

```bash
git clone https://github.com/pavanmadiraju91/shout-run.git
cd shout-run
pnpm install
cp .env.example .env
```

### Worker secrets

```bash
cd packages/worker
wrangler secret put TURSO_URL
wrangler secret put TURSO_AUTH_TOKEN
wrangler secret put JWT_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
```

### Environment variables

| Variable | What it is |
|----------|-----------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `TURSO_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `JWT_SECRET` | Random secret for signing JWTs |
| `NEXT_PUBLIC_API_URL` | Public URL of deployed worker |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL of deployed worker |

### Deploy

```bash
pnpm --filter @shout/worker deploy   # Cloudflare Worker
cd packages/web && vercel deploy      # Web frontend
```

## Development

```bash
pnpm install          # install everything
pnpm dev              # all dev servers in parallel
pnpm build            # build all packages (Turborepo orders them)
pnpm lint             # lint
pnpm typecheck        # type-check
```

Per-package:

```bash
pnpm --filter @shout/shared build    # types + protocol (build first)
pnpm --filter @shout/cli build       # CLI
pnpm --filter @shout/sdk build       # TypeScript SDK
pnpm --filter @shout/mcp build       # MCP server (needs SDK built)
pnpm --filter @shout/worker dev      # Worker dev server
pnpm --filter @shout/web dev         # Next.js on :3000
pnpm --filter @shout/worker test     # Vitest tests
```

Python:

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

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Open a pull request

## License

[MIT](LICENSE)
