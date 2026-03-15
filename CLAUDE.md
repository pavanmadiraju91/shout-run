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

### Replay storage (three-tier)

1. **DO memory** (hot) — `allChunks[]` accumulates binary frames during live broadcast, capped at 50 MB (`MAX_REPLAY_BYTES`).
2. **DO storage** (warm) — `persistReplayToStorage()` flushes chunks incrementally on alarm and on broadcaster close. Key: `'replayChunks'`.
3. **R2** (cold) — `persistSession()` writes `sessions/{id}.json` + `sessions/{id}.meta.json` to `SESSIONS_BUCKET` on session end. Optional — only when R2 is bound.

Replay and export handlers try memory → DO storage → R2 in order. Export produces asciicast v2 (`.cast`) — NDJSON with header `{ version: 2, width, height }` then `[elapsed_secs, "o", text]` events.

### Rate limiting

Dual enforcement: CLI and SessionHub both cap at `100 KB/s` (`DEFAULT_RATE_LIMITS` in `shared/src/types.ts`). CLI defers flush; server silently drops frames over limit. Daily session cap: 50 per user (enforced in `routes/sessions.ts`, returns HTTP 429). Vote dedup uses `RATE_LIMITS` KV namespace with key `vote:{sessionId}:{voterId}` and 30-day TTL.

### Worker routing (`packages/worker/src/index.ts`)

Hono app. Auth routes in `routes/auth.ts` (GitHub device flow proxy), session routes in `routes/sessions.ts`. JWT auth via Web Crypto API. Database is Turso (libSQL) with Drizzle ORM, schema in `lib/db.ts` (users, sessions, follows tables).

Key session endpoints in `routes/sessions.ts`: `POST /api/sessions` (create, rate-limited), `GET .../live` and `.../recent` (public feeds sorted by upvotes), `POST .../:id/upvote` (anonymous — accepts `voterId`, deduped via KV), `GET .../:id/replay` (streams chunks from DO/R2 fallback chain), `GET .../:id/export` (asciicast v2 `.cast` download), `GET .../:id/ws/broadcaster` and `.../ws/viewer` (WebSocket upgrades).

### CLI auth flow

`shout login` → GitHub device flow routed through worker (`/api/auth/device-code`, `/api/auth/token`) → worker exchanges code for GitHub token, creates/finds user, returns JWT → CLI stores JWT via keytar (OS keychain) with fallback to `~/.shout/config.json`.

### Web app (`packages/web/`)

Next.js App Router. Routes: `/` (homepage with hero, HN-style tabbed feed with upvoting), `/about`, `/[username]` (profile + session tabs), `/[username]/[sessionId]` (viewer). Zustand for client state.

Terminal and PlayerBar are `next/dynamic` with `ssr: false` (xterm.js needs browser APIs). Theme system: `ThemeProvider` stores `'dark' | 'light'` in `localStorage('shout-theme')`, sets `data-theme` attribute on `<html>`. CSS variables (`--shout-bg`, `--shout-surface`, `--shout-text`, `--shout-accent`, etc.) defined in `globals.css` for both themes. Tailwind maps these via `shout-*` utility classes (e.g., `bg-shout-surface`) in `tailwind.config.ts`.

### CLI environment stripping (`packages/cli/src/commands/broadcast.ts`)

Before PTY spawn, env vars matching 25 sensitive prefixes are removed: `AWS_SECRET`, `DATABASE_URL`, `GITHUB_TOKEN`, `GH_TOKEN`, `NPM_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `JWT_SECRET`, `PRIVATE_KEY`, `SECRET_KEY`, `CLOUDFLARE_API_TOKEN`, `STRIPE_SECRET`, etc. The spawned shell gets a clean env plus `SHOUT_SESSION=1`.

## Environment setup

Copy `.env.example` (root) and `packages/web/.env.local.example`. Key vars: `NEXT_PUBLIC_API_URL` (API base, default `https://api.shout.dev`), `NEXT_PUBLIC_WS_URL` (WebSocket base). Worker secrets (`TURSO_AUTH_TOKEN`, `JWT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`) are set via `wrangler secret put`. Worker bindings in `wrangler.toml`: `SESSION_HUB` (Durable Object), `SESSIONS_BUCKET` (R2), `RATE_LIMITS` (KV).

## Deployment

CI (`.github/workflows/ci.yml`): lint + typecheck + build on PRs and pushes to main. Worker auto-deploys on push to main when `packages/worker/**` or `packages/shared/**` change (`deploy-worker.yml`, uses `cloudflare/wrangler-action@v3`). Web deploys to Vercel on push to main when `packages/web/**` or `packages/shared/**` change (`deploy-web.yml`). CLI publishes to npm on `cli-v*` tags (`publish-cli.yml` — extracts version from tag, verifies match with `package.json`, runs `pnpm publish`).

## Key conventions

- **pnpm monorepo** with Turborepo — shared must build before cli/worker/web
- **ESM throughout** — all packages use `"type": "module"`, imports need `.js` extensions in TypeScript
- **Worker build** uses `wrangler deploy --dry-run --outdir=dist` (not tsc)
- **Web** uses `next.config.js` with `transpilePackages: ['@shout/shared']`
- **Worker secrets** are set via `wrangler secret put`, not in wrangler.toml
- **Prettier**: semicolons, single quotes, trailing commas, 100 char width
