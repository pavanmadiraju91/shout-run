<div align="center">
  <a href="https://shout.run">
    <img src="https://shout.run/logo.png" alt="shout.run" width="120" />
  </a>
  <h1>@shout/sdk</h1>
</div>

TypeScript SDK for [shout.run](https://shout.run). Broadcast your terminal from code.

Write a script, pipe some output, and anyone with the link watches it live.

## Install

```bash
npm install @shout/sdk
```

## Quick Start

```typescript
import { ShoutSession } from '@shout/sdk';

const session = new ShoutSession({
  apiKey: 'shout_sk_...',
  title: 'My Agent Session',
});

const info = await session.start();
console.log(`Live at: ${info.url}`);

session.write('Hello, world!\r\n');
// ... do work ...

await session.end();
```

## Getting an API Key

```bash
npm install -g shout-run
shout login
shout api-key create "My Agent"
```

The key is printed once. Save it somewhere safe. Keys start with `shout_sk_`.

You can list your keys with `shout api-key list` and revoke one with `shout api-key revoke <id>`.

## API Reference

### `new ShoutSession(options)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | API key (starts with `shout_sk_`) |
| `title` | `string` | `'SDK Session'` | Session title shown to viewers |
| `visibility` | `'public' \| 'followers' \| 'private'` | `'public'` | Who can see the session |
| `cols` | `number` | `80` | Terminal columns |
| `rows` | `number` | `24` | Terminal rows |
| `apiUrl` | `string` | `'https://api.shout.run'` | API base URL |

### Methods

- **`start()`** — Creates the session and connects WebSocket. Returns `{ sessionId, url, wsUrl }`.
- **`write(data: string | Buffer)`** — Sends terminal output. Automatically buffered, rate-limited, and chunked.
- **`resize(cols, rows)`** — Updates terminal dimensions.
- **`end()`** — Flushes buffer, sends end frame, closes session.

### Properties

- **`state`** — Current state: `'idle' | 'connecting' | 'live' | 'ending' | 'ended'`
- **`viewers`** — Current viewer count
- **`id`** — Session ID (null before start)

### Events

```typescript
session.on('connected', () => { /* WebSocket connected */ });
session.on('disconnected', (code, reason) => { /* connection lost */ });
session.on('reconnecting', (attempt) => { /* reconnecting... */ });
session.on('viewers', (count) => { /* viewer count updated */ });
session.on('error', (error) => { /* error occurred */ });
session.on('stateChange', (state) => { /* state changed */ });
```

## Piping Process Output

```typescript
import { ShoutSession } from '@shout/sdk';
import { spawn } from 'node:child_process';

const session = new ShoutSession({
  apiKey: process.env.SHOUT_API_KEY!,
  title: 'Running tests',
});

await session.start();

const child = spawn('npm', ['test'], { shell: true });

child.stdout.on('data', (data) => session.write(data));
child.stderr.on('data', (data) => session.write(data));

child.on('close', async () => {
  await session.end();
});
```

## Search and Content API

Search existing sessions and read their transcripts.

### `ShoutSession.searchSessions(apiKey, query, options?)`

Search for sessions by query string, tags, and status.

```typescript
const results = await ShoutSession.searchSessions(apiKey, 'typescript', {
  tags: ['tutorial', 'demo'],
  status: 'ended',
  limit: 10,
});

for (const session of results) {
  console.log(`${session.title} by ${session.username}`);
}
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `tags` | `string[]` | Filter by tags (any match) |
| `status` | `'live' \| 'ended'` | Filter by session status |
| `limit` | `number` | Max results (1-50, default: 20) |
| `cursor` | `string` | Cursor for pagination |
| `apiUrl` | `string` | API base URL override |

### `ShoutSession.getSessionContent(apiKey, sessionId, options?)`

Get session metadata and plain-text transcript.

```typescript
const content = await ShoutSession.getSessionContent(apiKey, 'abc123xyz');
console.log(`Title: ${content.session.title}`);
console.log(`Transcript: ${content.transcript.slice(0, 200)}...`);
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `apiUrl` | `string` | API base URL override |

## License

MIT
