<div align="center">
  <h1>shout</h1>
  <p><strong>Live terminal broadcasting for developers</strong></p>
  <p>Broadcast your terminal to the world. Live.</p>
  <p>
    <a href="https://www.npmjs.com/package/shout-cli"><img src="https://img.shields.io/npm/v/shout-cli" alt="npm version" /></a>
    <a href="https://github.com/pavanmadiraju91/ideal-robot/actions/workflows/ci.yml"><img src="https://github.com/pavanmadiraju91/ideal-robot/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://github.com/pavanmadiraju91/ideal-robot/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license" /></a>
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
# Install globally
npm install -g shout-cli

# Authenticate with GitHub
shout login

# Start an interactive broadcast (launches a PTY shell)
shout

# Or pipe any command
npm run build | shout
```

When you run `shout` interactively, the CLI prompts for a session title and visibility, then starts a live broadcast of your shell. Viewers watch at `https://shout.dev/<username>/<sessionId>`.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   Your Terminal             Cloudflare Worker              Viewers      │
│                                                                         │
│   ┌───────────┐            ┌─────────────────┐          ┌───────────┐  │
│   │  shout    │── binary ─>│  SessionHub DO  │<─────────│  Next.js  │  │
│   │   CLI     │   frames   │  (fan-out hub)  │  binary  │  + xterm  │  │
│   └───────────┘            └────────┬────────┘  frames  └───────────┘  │
│       │                             │                        │         │
│   env-var stripping         Turso DB (sessions,        real-time       │
│   + binary encoding         users, follows)            decoding        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

1. The CLI captures terminal output (via node-pty for interactive mode, or stdin for piped mode)
2. Sensitive environment variables are stripped from the broadcast shell before it spawns
3. Data is encoded into a compact binary frame protocol and sent over WebSocket
4. A Cloudflare Durable Object (SessionHub) fans out frames to all connected viewers
5. The Next.js web app decodes frames and renders them into an xterm.js terminal

## Features

### Pipe Any Command

```bash
# Build logs
npm run build | shout

# Test output
pytest -v | shout

# Deployment logs
kubectl apply -f deployment.yaml | shout

# Long-running processes
tail -f /var/log/app.log | shout
```

### Interactive Terminal Broadcasting

When run without a pipe, `shout` spawns a full PTY shell. Everything you type and see is broadcast live — just like streaming, but for your terminal.

```bash
shout                          # prompts for title and visibility
shout -t "building my app"     # skip the title prompt
shout -v private               # private session (link only)
```

### Environment Variable Stripping

Sensitive data is protected **before it ever leaves your machine**. When the CLI spawns a broadcast shell, it strips 25 known sensitive environment variable prefixes from the PTY environment — including `AWS_SECRET`, `GITHUB_TOKEN`, `OPENAI_API_KEY`, `STRIPE_SECRET`, `DATABASE_URL`, `JWT_SECRET`, and others.

This means that even if you run `env` or `printenv` during a broadcast, those values will not appear in the output. The stripping happens locally before the shell starts, so secrets never reach the network.

### Session Visibility

Control who can see your broadcast:

| Visibility | Behavior |
|------------|----------|
| `public` | Listed on the live feed, anyone can watch |
| `followers` | Visible only to your followers |
| `private` | Unlisted — only people with the direct link |

### Session Replay

Late joiners receive the last 100 chunks of terminal output from a ring buffer, so they can catch up on what happened before they arrived.

### Responsive Web Viewer

The web app renders broadcasts in a full xterm.js terminal with GitHub Dark and Solarized Light themes that switch dynamically based on your system preference. It works on desktop and mobile with automatic terminal resizing.

## CLI Reference

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

When stdin is piped, `broadcast` is selected automatically — no need to type `shout broadcast`.

## Architecture

```
packages/
  shared/    @shout/shared    Types, binary protocol, constants (build first)
  cli/       shout-cli        Commander.js CLI (node-pty, ws, keytar)
  worker/    @shout/worker    Cloudflare Workers + Durable Objects (Hono, Drizzle, Turso)
  web/       @shout/web       Next.js 15 / React 19 frontend (xterm.js, Zustand)
```

### Binary WebSocket Protocol

Every frame follows the format: `[type: 1 byte][timestamp: 4 bytes uint32][payload: variable]`

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

### Key Internals

- **SessionHub Durable Object**: one instance per broadcast session. Accepts a single broadcaster WebSocket and many viewer WebSockets (using hibernation API). Maintains a 100-chunk ring buffer for late joiners. Alarm-based heartbeat pings the broadcaster every 30 seconds; 60 seconds of silence triggers cleanup.
- **R2 replay storage**: when a session ends, all output is persisted to R2 as JSON. Replay requests follow a DO memory → DO storage → R2 fallback chain, so replays survive Durable Object hibernation and eviction.
- **Authentication**: GitHub device flow routed through the worker (`/api/auth/device-code`, `/api/auth/token`). The worker exchanges the code for a GitHub token, creates or finds the user, and returns a JWT. The CLI stores credentials via keytar (OS keychain) with a fallback to `~/.shout/config.json`.
- **Rate limiting**: in-memory bytes-per-second throttling inside the Durable Object (100 KB/s default), database-backed daily session limits per user, and KV for vote deduplication. Large output is chunked into 64 KB WebSocket messages to stay under Cloudflare's 1 MB frame limit.

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
git clone https://github.com/pavanmadiraju91/ideal-robot.git
cd ideal-robot
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
# Install all dependencies
pnpm install

# Start all dev servers in parallel (worker + web)
pnpm dev

# Build all packages (shared must build first, handled by Turborepo)
pnpm build

# Lint all packages
pnpm lint

# Type-check all packages
pnpm typecheck
```

Build or run individual packages with `--filter`:

```bash
pnpm --filter @shout/shared build
pnpm --filter @shout/cli build
pnpm --filter @shout/worker dev
pnpm --filter @shout/web dev
```

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
    <a href="https://shout.dev">Website</a> &middot;
    <a href="https://github.com/pavanmadiraju91/ideal-robot/issues">Issues</a>
  </p>
</div>
