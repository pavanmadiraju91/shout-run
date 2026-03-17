# Comprehensive Testing Plan for Shout

> **Status**: Plan only — no tests exist yet.
> **Framework**: Vitest (all packages) + React Testing Library (web)
> **Generated**: 2026-03-17

---

## Table of Contents

1. [Setup & Tooling](#1-setup--tooling)
2. [packages/shared — Binary Protocol & Constants](#2-packagesshared)
3. [packages/cli — CLI Commands & Auth](#3-packagescli)
4. [packages/worker — API, JWT, Durable Objects](#4-packagesworker)
5. [packages/web — Store, Hooks, Components](#5-packagesweb)
6. [Refactoring Prerequisites](#6-refactoring-prerequisites)
7. [CI Integration](#7-ci-integration)
8. [Priority & Execution Order](#8-priority--execution-order)

---

## 1. Setup & Tooling

### Install (root)

```bash
pnpm add -Dw vitest @vitest/coverage-v8
```

### Per-package extras

| Package | Additional deps |
|---------|----------------|
| `shared` | — (none) |
| `cli` | `memfs` (mock filesystem for auth.ts) |
| `worker` | `@cloudflare/vitest-pool-workers` (Durable Object testing) |
| `web` | `@testing-library/react @testing-library/jest-dom jsdom @testing-library/user-event` |

### Root Vitest config (`vitest.workspace.ts`)

```ts
export default [
  'packages/shared',
  'packages/cli',
  'packages/worker',
  'packages/web',
];
```

Each package gets its own `vitest.config.ts`. The `web` package uses `environment: 'jsdom'`. The `worker` package uses `@cloudflare/vitest-pool-workers` for Durable Object tests.

### Scripts

```jsonc
// root package.json
"test": "vitest",
"test:ci": "vitest run --coverage"
```

---

## 2. packages/shared

**File: `packages/shared/src/protocol.ts`** — 13 exported functions, highest test priority.

### 2.1 `encodeFrame` / `decodeFrame` round-trips

| Test case | Input | Expected |
|-----------|-------|----------|
| String payload round-trip | `encodeFrame(Output, "hello", 42)` → decode | `{ type: 0x01, timestamp: 42, payload matches "hello" }` |
| Uint8Array payload round-trip | `encodeFrame(Output, new Uint8Array([1,2,3]), 0)` → decode | payload `[1,2,3]` |
| Empty payload | `encodeFrame(Ping, new Uint8Array(0), 0)` → decode | payload length 0 |
| Max uint32 timestamp | timestamp `4294967295` | survives round-trip |
| All FrameType values | Loop 0x01..0x08 | Each decodes to correct type |
| Unicode string payload | `"こんにちは 🎉"` | Survives encode → decode → `payloadToString` |
| ANSI escape sequences | `"\x1b[31mred\x1b[0m"` | Exact byte match |
| Header is exactly 5 bytes | Any frame | `frame.byteLength === 5 + payload.byteLength` |
| Timestamp is big-endian | Known value | Manually verify byte order |

### 2.2 `decodeFrame` error handling

| Test case | Input | Expected |
|-----------|-------|----------|
| Buffer < 5 bytes | `new Uint8Array([0x01, 0, 0])` | Throws error |
| Exactly 5 bytes (empty payload) | `encodeFrame(Ping, new Uint8Array(0), 0)` | Decodes with empty payload |
| ArrayBuffer input (not Uint8Array) | `.buffer` of encoded frame | Decodes correctly |

### 2.3 Specialized encode/decode functions

#### `encodeOutputFrame` / round-trip
- Empty string → decodes to empty payload
- ASCII terminal output → exact match
- Multi-byte UTF-8 → exact match
- Large string (100KB) → works without truncation

#### `encodeMetaFrame`
- `{}` → decodes payload to `"{}"`
- `{ title: "Hello", user: { id: "abc" } }` → JSON round-trip matches
- Values with special characters → preserved

#### `encodeViewerCountFrame` / `decodeViewerCount`
- Count 0 → round-trip 0
- Count 1 → round-trip 1
- Count 4294967295 (max uint32) → round-trip
- Payload is exactly 4 bytes

#### `encodeResizeFrame` / `decodeResize`
- 80×24 (standard) → `{ cols: 80, rows: 24 }`
- 1×1 (minimum) → round-trip
- 65535×65535 (max uint16) → round-trip
- Payload is exactly 4 bytes

#### `encodeEndFrame`, `encodePing`, `encodePong`
- Each produces exactly 5 bytes
- Correct FrameType in byte 0
- Empty payload

#### `encodeErrorFrame`
- `"session not found"` → decodes to same string
- Empty string → empty payload
- Unicode error message → exact match

### 2.4 `payloadToString`
- ASCII → correct string
- UTF-8 multi-byte → correct string
- Empty → `""`

### 2.5 Constants (`types.ts`, `constants.ts`)

| Test | Assertion |
|------|-----------|
| `DEFAULT_RATE_LIMITS.maxBytesPerSecond` | `=== 102400` (100KB) |
| `DEFAULT_RATE_LIMITS.maxSessionDurationMs` | `=== 14400000` (4h) |
| `DEFAULT_RATE_LIMITS.maxSessionsPerDay` | `=== 50` |
| `WS_CLOSE.NORMAL` | `=== 1000` |
| `WS_CLOSE.AUTH_FAILED` | `=== 4001` |
| `WS_CLOSE.RATE_LIMITED` | `=== 4002` |
| `API_PATHS.SESSION("abc")` | `=== "/api/sessions/abc"` |
| `API_PATHS.SESSION_WS("abc")` | `=== "/api/sessions/abc/ws"` |
| `API_PATHS.USER_SESSIONS("alice")` | `=== "/api/users/alice/sessions"` |
| `API_PATHS.SESSION("")` (edge) | `=== "/api/sessions/"` |
| `CHUNK_DEBOUNCE_MS` | `=== 16` |
| `LATE_JOINER_BUFFER_SIZE` | `=== 100` |
| `PING_INTERVAL_MS` | `=== 30000` |

**Estimated test count: ~50 tests across 2 test files**

---

## 3. packages/cli

### 3.1 Refactor first (see Section 6)

Two pure functions in `broadcast.ts` are **not exported**. Extract to `lib/format.ts`:
- `formatDuration(ms: number): string`
- `formatBytes(bytes: number): string`

The env-stripping block (lines 372-379) should be extracted to `lib/env.ts`:
- `stripSensitiveEnv(env: NodeJS.ProcessEnv): Record<string, string>`

### 3.2 `formatDuration(ms)` — `lib/format.ts`

| Input (ms) | Expected output |
|------------|-----------------|
| `0` | `"0s"` |
| `999` | `"0s"` |
| `1000` | `"1s"` |
| `59000` | `"59s"` |
| `60000` | `"1m 0s"` |
| `61000` | `"1m 1s"` |
| `3600000` | `"1h 0m 0s"` |
| `3661000` | `"1h 1m 1s"` |
| `86400000` | `"24h 0m 0s"` |

### 3.3 `formatBytes(bytes)` — `lib/format.ts`

| Input | Expected output |
|-------|-----------------|
| `0` | `"0 B"` |
| `1` | `"1 B"` |
| `1023` | `"1023 B"` |
| `1024` | `"1.0 KB"` |
| `1536` | `"1.5 KB"` |
| `1048576` | `"1.0 MB"` |
| `1572864` | `"1.5 MB"` |

### 3.4 `stripSensitiveEnv(env)` — `lib/env.ts`

| Test case | Input env | Expected |
|-----------|-----------|----------|
| Strips `AWS_SECRET_ACCESS_KEY` | `{ AWS_SECRET_ACCESS_KEY: "x", HOME: "/home" }` | `{ HOME: "/home", SHOUT_SESSION: "1" }` |
| Strips `GITHUB_TOKEN` | `{ GITHUB_TOKEN: "ghp_xxx" }` | `{ SHOUT_SESSION: "1" }` |
| Strips `OPENAI_API_KEY` | ... | stripped |
| Strips `ANTHROPIC_API_KEY` | ... | stripped |
| Case insensitive matching | `{ github_token: "x" }` | stripped |
| Keeps safe vars | `{ HOME: "/home", PATH: "/usr/bin", TERM: "xterm" }` | all kept + `SHOUT_SESSION` |
| Skips `undefined` values | `{ FOO: undefined }` | not in output |
| Always adds `SHOUT_SESSION=1` | `{}` | `{ SHOUT_SESSION: "1" }` |
| All 25 prefixes blocked | One env per prefix | All stripped |

### 3.5 `lib/auth.ts` — Token storage

Mock `keytar` (optional dep) and filesystem.

| Test case | Setup | Expected |
|-----------|-------|----------|
| `saveToken` with keytar | Mock keytar available | Calls `setPassword`, writes config with username/avatar |
| `saveToken` without keytar | Mock keytar unavailable | Writes full token to config file |
| `getToken` with keytar | Token in keychain + config | Returns merged `AuthTokens` |
| `getToken` keytar fails | keytar throws | Falls back to file config |
| `getToken` no token anywhere | Empty state | Returns `null` |
| `removeToken` | Token exists | Deletes keychain entry + config file |
| `isLoggedIn` when logged in | `getToken` returns valid | `true` |
| `isLoggedIn` when not logged in | `getToken` returns null | `false` |
| `isLoggedIn` with empty accessToken | `getToken` returns `{ accessToken: "" }` | `false` |
| Config file doesn't exist | No `~/.shout/config.json` | `readConfigFile` returns null |
| Config file is malformed JSON | `"{ broken"` | `readConfigFile` returns null |

### 3.6 `lib/stream.ts` — `ReconnectingWebSocket`

Mock the `ws` module.

| Test case | Expected |
|-----------|----------|
| `connect()` — establishes connection | `open` event emitted |
| `send()` when connected | Data sent immediately |
| `send()` when disconnected | Data queued |
| Queue flushed on reconnect | Queued messages sent after `open` |
| `close()` prevents reconnect | `isClosed` set, no `scheduleReconnect` |
| Exponential backoff | Delays: 1s, 2s, 4s, 8s, 16s, 30s, 30s (capped) |
| `reconnecting` event | Emitted with attempt count |
| Binary message → ArrayBuffer | `message` event payload is ArrayBuffer |

**Estimated test count: ~45 tests across 4 test files**

---

## 4. packages/worker

### 4.1 `lib/jwt.ts` — JWT functions

| Test case | Input | Expected |
|-----------|-------|----------|
| `base64UrlEncode` → `base64UrlDecode` round-trip | Random bytes | Exact match |
| `base64UrlEncode` padding stripped | Input requiring `=` padding | No `=` in output |
| `base64UrlDecode` handles missing padding | `"SGVsbG8"` (no `=`) | Decodes `"Hello"` |
| `createToken` produces 3-part JWT | Payload + secret | `header.payload.signature` format |
| `createToken` header is `{"alg":"HS256","typ":"JWT"}` | Any payload | Verify decoded header |
| `createToken` payload includes `iat` and `exp` | No explicit exp | Both present |
| `createToken` with custom `expiresInSec` | `3600` | `exp - iat === 3600` |
| `verifyToken` valid token | Token from `createToken` | Returns payload |
| `verifyToken` expired token | Token with `exp` in past | Returns `null` |
| `verifyToken` wrong secret | Token + different secret | Returns `null` |
| `verifyToken` tampered payload | Modified middle segment | Returns `null` |
| `verifyToken` malformed token | `"not.a.jwt"` with bad base64 | Returns `null` |
| `verifyToken` token with only 2 parts | `"a.b"` | Returns `null` |

### 4.2 `lib/api-keys.ts`

| Test case | Expected |
|-----------|----------|
| `generateApiKey` starts with `shout_sk_` | Prefix check |
| `generateApiKey` total length is `8 + 64 = 72` | `.length === 72` |
| `generateApiKey` hex chars after prefix | Regex `/^shout_sk_[0-9a-f]{64}$/` |
| `generateApiKey` is random (two calls differ) | Call twice, assert not equal |
| `hashApiKey` is deterministic | Same input → same output |
| `hashApiKey` different inputs → different hashes | Two different keys |
| `isApiKey("shout_sk_abc123...")` | `true` |
| `isApiKey("Bearer eyJhbG...")` | `false` |
| `isApiKey("")` | `false` |
| `getApiKeyPrefix("shout_sk_abcdefgh1234567890ab")` | First 20 chars |
| `getApiKeyPrefix` short input | Returns full string if < 20 |

### 4.3 `lib/db.ts` — `generateId`

| Test case | Expected |
|-----------|----------|
| Returns 12-char string | `.length === 12` |
| Alphanumeric only | Regex `/^[a-zA-Z0-9]{12}$/` |
| Two calls produce different IDs | Assert not equal |

### 4.4 `routes/sessions.ts` — Input validation logic

These tests target the sanitization logic that should ideally be extracted into pure helper functions.

| Test case | Input | Expected |
|-----------|-------|----------|
| Title strips control chars | `"hello\x00world\x1b"` | `"helloworld"` |
| Title clamped to 256 chars | 300-char string | Truncated to 256 |
| Description strips control chars | `"desc\x00"` | `"desc"` |
| Description clamped to 500 chars | 600-char string | Truncated to 500 |
| Tags: max 5 tags | Array of 10 tags | Only first 5 |
| Tags: max 32 chars per tag | `"a".repeat(50)` | Truncated to 32 |
| Visibility validation | `"invalid"` | Defaults to `"public"` |
| Visibility: `"public"` | Accepted as-is |
| Visibility: `"private"` | Accepted as-is |

### 4.5 `routes/oembed.ts`

| Test case | Expected |
|-----------|----------|
| `SESSION_URL_RE` matches valid URLs | `"https://shout.run/user/sessionId"` → match |
| `SESSION_URL_RE` rejects invalid URLs | `"https://evil.com/x/y"` → no match |
| HTML iframe output contains session URL | String includes correct src |
| `maxwidth` defaults to 800 | When not provided |
| `maxheight` clamped to 600 | When > 600 |

### 4.6 `middleware/auth.ts` — Auth middleware

With mocked Hono context and JWT/API key functions.

| Test case | Expected |
|-----------|----------|
| Valid JWT in `Authorization: Bearer` header | User set on context |
| Valid API key in `Authorization: Bearer` header | User resolved via API key lookup |
| No auth header | 401 response |
| Invalid JWT | 401 response |
| Expired JWT | 401 response |
| `optionalAuthMiddleware` with no header | Proceeds without user (no 401) |
| `optionalAuthMiddleware` with valid JWT | User set on context |

### 4.7 `durable-objects/SessionHub.ts` — Key logic

These require `@cloudflare/vitest-pool-workers` or manual mocking of the DO runtime.

| Test case | Expected |
|-----------|----------|
| Ring buffer stays at 100 chunks | After 150 inserts, `ringBuffer.length === 100` |
| Late joiner gets ring buffer contents | New viewer receives buffered chunks |
| ViewerCount frame sent on viewer connect | Broadcast to all viewers |
| ViewerCount decrements on viewer disconnect | Accurate count |
| Broadcaster silence > 60s → cleanup | Dead session handling |
| Rate limiting: frames > 100KB/s dropped | Server-side enforcement |
| `persistReplayToStorage` writes incrementally | Only new chunks flushed |
| Replay fallback: memory → DO storage → R2 | Three-tier check |
| Export produces valid asciicast v2 | NDJSON with header + events |

**Estimated test count: ~65 tests across 6 test files**

---

## 5. packages/web

### 5.1 `lib/time.ts` — `formatDuration`

| Input (ms) | Expected |
|------------|----------|
| `0` | `"0:00"` |
| `1000` | `"0:01"` |
| `59000` | `"0:59"` |
| `60000` | `"1:00"` |
| `61000` | `"1:01"` |
| `3600000` | `"1:00:00"` |
| `3661000` | `"1:01:01"` |
| `500` | `"0:00"` (sub-second) |

### 5.2 `lib/api.ts` — API client functions

Mock `fetch` globally.

| Test case | Expected |
|-----------|----------|
| `fetchApi` success | Returns parsed JSON |
| `fetchApi` non-200 response | Throws with status |
| `fetchApi` network error | Throws error |
| `fetchLiveSessions` calls correct endpoint | `/api/sessions/live` |
| `fetchRecentSessions` calls correct endpoint | `/api/sessions/recent` |
| `fetchSession("abc")` calls correct endpoint | `/api/sessions/abc` |
| `getVoterId` creates ID if missing | Writes to localStorage |
| `getVoterId` returns existing ID | Reads from localStorage |
| `hasVoted("s1")` when voted | `true` |
| `hasVoted("s1")` when not voted | `false` |
| `markVoted("s1")` | Stores in localStorage |
| `upvoteSession` sends POST with voterId | Correct body |
| `upvoteSession` returns null on error | Non-200 response |

### 5.3 `lib/store.ts` — Zustand store

| Test case | Expected |
|-----------|----------|
| Initial state | `liveSessions: [], recentSessions: [], feedItems: [], loading: false, error: null` |
| `fetchFeed` merges live + recent | Combined `feedItems` sorted correctly |
| `fetchFeed` sets loading true then false | State transitions |
| `fetchFeed` sets error on failure | `error` contains message |
| `updateUpvotes(sessionId, newCount)` | Correct feedItem updated |
| `updateUpvotes` for non-existent ID | No crash, no change |
| `fetchSession` caches by ID | Second call doesn't fetch |
| `clearError` | `error: null` |

### 5.4 `lib/socket.ts` — WebSocket client

| Test case | Expected |
|-----------|----------|
| `getWebSocketUrl` with HTTPS API URL | Returns `wss://...` |
| `getWebSocketUrl` with HTTP API URL | Returns `ws://...` |
| `processFrame` with Output frame | Calls `onOutput` callback |
| `processFrame` with Meta frame | Calls `onMeta` callback |
| `processFrame` with ViewerCount frame | Calls `onViewerCount` with number |
| `processFrame` with End frame | Calls `onEnd` callback |
| `processFrame` with Resize frame | Calls `onResize` with `{ cols, rows }` |
| `processFrame` with Error frame | Calls `onError` with message |
| `createSocket` reconnect backoff | Exponential up to max |

### 5.5 `hooks/useReplayController.ts`

| Test case | Expected |
|-----------|----------|
| `replayTo(0)` | No chunks written |
| `replayTo(5000)` | All chunks with timestamp ≤ 5s written |
| `play` starts playback loop | State: `playing: true` |
| `pause` stops playback | State: `playing: false` |
| `seek(50)` on 10s recording | Jumps to 5s |
| `setSpeed(2)` | Playback at 2x speed |
| Speed cycling | 1x → 1.5x → 2x → 0.5x → 1x |

### 5.6 Components (React Testing Library)

#### `ThemeProvider`
| Test case | Expected |
|-----------|----------|
| Default theme matches `prefers-color-scheme` | Reads system preference |
| `toggle()` switches dark ↔ light | `data-theme` attribute changes |
| Theme persists to localStorage | Value written on toggle |
| Reads theme from localStorage on mount | Restores previous choice |

#### `FeedItem`
| Test case | Expected |
|-----------|----------|
| Renders session title | Text present |
| Renders username | Link to profile |
| Renders upvote count | Number displayed |
| Click upvote button | Optimistic update, API called |
| Already-voted session shows voted state | Visual indicator |
| Live session shows LiveBadge | Badge component present |

#### `PlayerBar`
| Test case | Expected |
|-----------|----------|
| Renders play/pause button | Button present |
| Click play triggers callback | `onPlay` called |
| Progress bar reflects currentTime | Width percentage correct |
| Click speed button cycles speeds | Text updates |
| Slider drag calls onSeek | Callback with percentage |

#### `LiveBadge`
| Test case | Expected |
|-----------|----------|
| Renders "LIVE" text | Text present |
| Has pulsing animation class | CSS class present |

#### `ViewerCount`
| Test case | Expected |
|-----------|----------|
| Renders count | Number displayed |
| Count of 0 | Shows 0 |
| Count updates animate | Class applied on change |

**Estimated test count: ~75 tests across 8 test files**

---

## 6. Refactoring Prerequisites

Before writing tests, extract these pure functions so they can be imported and tested:

### 6.1 `packages/cli/src/lib/format.ts` (new file)

Extract from `broadcast.ts`:
```ts
export function formatDuration(ms: number): string { ... }
export function formatBytes(bytes: number): string { ... }
```

### 6.2 `packages/cli/src/lib/env.ts` (new file)

Extract from `broadcast.ts` (lines 372-379):
```ts
export const SENSITIVE_ENV_PREFIXES = [ ... ];

export function stripSensitiveEnv(
  env: Record<string, string | undefined>
): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, val] of Object.entries(env)) {
    if (val === undefined) continue;
    const upper = key.toUpperCase();
    if (SENSITIVE_ENV_PREFIXES.some((prefix) => upper.startsWith(prefix))) continue;
    clean[key] = val;
  }
  clean.SHOUT_SESSION = '1';
  return clean;
}
```

### 6.3 `packages/worker/src/lib/validation.ts` (new file)

Extract input sanitization from `routes/sessions.ts`:
```ts
export function sanitizeTitle(title: string): string { ... }
export function sanitizeDescription(desc: string): string { ... }
export function sanitizeTags(tags: string[]): string[] { ... }
export function validateVisibility(v: string): SessionVisibility { ... }
```

### 6.4 `packages/web/src/lib/socket.ts`

Ensure `processFrame` and `getWebSocketUrl` are exported (they may already be).

---

## 7. CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Test
  run: pnpm test:ci

- name: Upload coverage
  uses: actions/upload-artifact@v4
  with:
    name: coverage
    path: coverage/
```

Run **after** the existing `build` step (tests depend on shared being built).

### Coverage thresholds (initial targets)

| Package | Statements | Branches | Functions |
|---------|-----------|----------|-----------|
| shared | 95% | 90% | 100% |
| cli | 70% | 60% | 70% |
| worker | 60% | 50% | 60% |
| web | 50% | 40% | 50% |

These are starter targets. Raise them as coverage grows.

---

## 8. Priority & Execution Order

### Phase 1 — High Value, Low Effort (do first)

| # | Package | Test file | Tests | Why |
|---|---------|-----------|-------|-----|
| 1 | shared | `protocol.test.ts` | ~35 | Core binary protocol — bugs here break everything |
| 2 | shared | `constants.test.ts` | ~15 | Fast sanity checks on API paths and config values |
| 3 | web | `time.test.ts` | ~8 | Single pure function, trivial to test |
| 4 | worker | `jwt.test.ts` | ~13 | Auth security — must be correct |
| 5 | worker | `api-keys.test.ts` | ~11 | Auth security — must be correct |

### Phase 2 — Medium Effort, High Value

| # | Package | Test file | Tests | Why |
|---|---------|-----------|-------|-----|
| 6 | cli | `format.test.ts` | ~16 | After extracting to `lib/format.ts` |
| 7 | cli | `env.test.ts` | ~12 | After extracting to `lib/env.ts` — security critical |
| 8 | cli | `auth.test.ts` | ~11 | Token storage correctness |
| 9 | web | `api.test.ts` | ~13 | API client correctness |
| 10 | web | `store.test.ts` | ~8 | State management logic |
| 11 | web | `socket.test.ts` | ~9 | WebSocket frame processing |

### Phase 3 — Higher Effort

| # | Package | Test file | Tests | Why |
|---|---------|-----------|-------|-----|
| 12 | worker | `validation.test.ts` | ~9 | After extracting sanitization |
| 13 | worker | `oembed.test.ts` | ~5 | Regex and HTML generation |
| 14 | worker | `auth-middleware.test.ts` | ~7 | Middleware with mocked context |
| 15 | cli | `stream.test.ts` | ~8 | ReconnectingWebSocket with mocked ws |
| 16 | web | `useReplayController.test.ts` | ~7 | Hook testing with mock xterm |
| 17 | worker | `db.test.ts` | ~3 | `generateId` format |

### Phase 4 — Component Tests

| # | Package | Test file | Tests | Why |
|---|---------|-----------|-------|-----|
| 18 | web | `ThemeProvider.test.tsx` | ~4 | Theme toggle and persistence |
| 19 | web | `FeedItem.test.tsx` | ~6 | Upvote UX, rendering |
| 20 | web | `PlayerBar.test.tsx` | ~5 | Playback controls |
| 21 | web | `LiveBadge.test.tsx` | ~2 | Snapshot/smoke test |
| 22 | web | `ViewerCount.test.tsx` | ~3 | Count display |

### Phase 5 — Integration / Durable Object Tests

| # | Package | Test file | Tests | Why |
|---|---------|-----------|-------|-----|
| 23 | worker | `SessionHub.test.ts` | ~9 | DO logic with `@cloudflare/vitest-pool-workers` |

---

### Total Estimated Tests: ~235

| Package | Files | Tests |
|---------|-------|-------|
| shared | 2 | ~50 |
| cli | 4 | ~47 |
| worker | 6 | ~57 |
| web | 8 | ~81 |
| **Total** | **20** | **~235** |

---

## File Tree (final)

```
packages/
  shared/
    src/__tests__/
      protocol.test.ts
      constants.test.ts
    vitest.config.ts
  cli/
    src/
      lib/
        format.ts          ← NEW (extracted)
        env.ts             ← NEW (extracted)
        __tests__/
          format.test.ts
          env.test.ts
          auth.test.ts
          stream.test.ts
    vitest.config.ts
  worker/
    src/
      lib/
        validation.ts      ← NEW (extracted)
        __tests__/
          jwt.test.ts
          api-keys.test.ts
          db.test.ts
          validation.test.ts
      routes/__tests__/
        oembed.test.ts
      middleware/__tests__/
        auth.test.ts
      durable-objects/__tests__/
        SessionHub.test.ts
    vitest.config.ts
  web/
    src/
      lib/__tests__/
        time.test.ts
        api.test.ts
        store.test.ts
        socket.test.ts
      hooks/__tests__/
        useReplayController.test.ts
      components/__tests__/
        ThemeProvider.test.tsx
        FeedItem.test.tsx
        PlayerBar.test.tsx
        LiveBadge.test.tsx
        ViewerCount.test.tsx
    vitest.config.ts
vitest.workspace.ts
```
