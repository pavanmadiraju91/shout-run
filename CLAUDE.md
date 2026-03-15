# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**shout** — live terminal broadcasting for developers. A CLI captures terminal output, streams it over WebSocket through a Cloudflare Worker, and viewers watch in real-time via a Next.js web app with xterm.js.

## Commands

```bash
pnpm install              # install all deps
pnpm build                # build all packages (Turborepo, shared first)
pnpm dev                  # run all dev servers in parallel
pnpm lint                 # lint all packages
pnpm typecheck            # type-check all packages
pnpm clean                # remove all dist/node_modules

# Per-package (use --filter)
pnpm --filter @shout/shared build
pnpm --filter @shout/cli build        # tsc + copies patterns/
pnpm --filter @shout/worker dev       # wrangler dev
pnpm --filter @shout/worker deploy    # wrangler deploy
pnpm --filter @shout/web dev          # next dev on :3000
```

There are no tests yet.

## Architecture

```
packages/
  shared/   @shout/shared   — types, binary protocol, constants (build first)
  cli/      @shout/cli      — Commander.js CLI (node-pty, secret redaction)
  worker/   @shout/worker   — Cloudflare Workers + Durable Objects (Hono router)
  web/      @shout/web      — Next.js 15 / React 19 frontend (xterm.js, Zustand)
```

### Data flow

CLI captures PTY output → redacts secrets → encodes binary frames → WebSocket to Worker → SessionHub Durable Object fans out to viewer WebSockets → Web app decodes frames into xterm.js.

### Binary WebSocket protocol (`packages/shared/src/protocol.ts`)

Every frame: `[type: 1 byte][timestamp: 4 bytes uint32][payload: variable]`. Frame types: Output (0x01), Meta (0x02), ViewerCount (0x03), End (0x04), Ping (0x05), Pong (0x06), Error (0x07), Resize (0x08). All encode/decode functions are in shared.

### SessionHub Durable Object (`packages/worker/src/durable-objects/SessionHub.ts`)

One instance per broadcast session. Accepts a single broadcaster WebSocket and many viewer WebSockets (tagged via `acceptWebSocket` for hibernation). Maintains a 100-chunk ring buffer for late joiners. Alarm-based heartbeat pings the broadcaster every 30s; 60s silence = dead connection cleanup.

### Worker routing (`packages/worker/src/index.ts`)

Hono app. Auth routes in `routes/auth.ts` (GitHub device flow proxy), session routes in `routes/sessions.ts` (CRUD + WebSocket upgrade). JWT auth via Web Crypto API. Database is Turso (libSQL) with Drizzle ORM, schema in `lib/db.ts` (users, sessions, follows tables).

### CLI auth flow

`shout login` → GitHub device flow routed through worker (`/api/auth/device-code`, `/api/auth/token`) → worker exchanges code for GitHub token, creates/finds user, returns JWT → CLI stores JWT via keytar (OS keychain) with fallback to `~/.shout/config.json`.

### Web app (`packages/web/`)

Next.js App Router. Routes: `/` (homepage with hero, HN-style tabbed feed with upvoting), `/about`, `/[username]` (profile + session tabs), `/[username]/[sessionId]` (viewer). Terminal component wraps xterm.js with GitHub Dark theme and Solarized Light theme (dynamic switching via `useTheme()`). Zustand for client state. Custom color palette prefixed `shout-*` in Tailwind config.

## Key conventions

- **pnpm monorepo** with Turborepo — shared must build before cli/worker/web
- **ESM throughout** — all packages use `"type": "module"`, imports need `.js` extensions in TypeScript
- **Worker build** uses `wrangler deploy --dry-run --outdir=dist` (not tsc)
- **Web** uses `next.config.js` with `transpilePackages: ['@shout/shared']`
- **Worker secrets** are set via `wrangler secret put`, not in wrangler.toml
- **Prettier**: semicolons, single quotes, trailing commas, 100 char width
