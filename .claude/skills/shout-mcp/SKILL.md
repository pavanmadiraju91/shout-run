---
name: shout-mcp
description: Live terminal broadcasting with shout.run — start broadcasts, write terminal output, search and read sessions via the shout MCP server
user-invocable: true
allowed-tools:
  - "mcp:shout:shout_*"
---

# shout MCP Server

Broadcast terminal output live to [shout.run](https://shout.run). Viewers watch in real-time via a web terminal. Sessions are recorded for replay.

## Setup

### 1. Get an API key

Log in at [shout.run](https://shout.run), go to your profile, and create an API key.

### 2. Configure the MCP server

**TypeScript (npx)** — add to your MCP client config (e.g. `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "shout": {
      "command": "npx",
      "args": ["-y", "shout-run-mcp"],
      "env": {
        "SHOUT_API_KEY": "your-api-key"
      }
    }
  }
}
```

**Python (uvx):**

```json
{
  "mcpServers": {
    "shout": {
      "command": "uvx",
      "args": ["shout-run-mcp"],
      "env": {
        "SHOUT_API_KEY": "your-api-key"
      }
    }
  }
}
```

The `SHOUT_API_KEY` environment variable is **required** for all tools.

## Tools

### `shout_start_broadcast`

Start a live broadcast session. Returns a viewer URL.

| Parameter    | Type   | Required | Description                          |
|-------------|--------|----------|--------------------------------------|
| `title`     | string | no       | Session title shown to viewers (default: "Agent Session") |
| `visibility`| `"public"` \| `"private"` | no | Who can see the session (default: `"public"`) |

Only one broadcast can be active at a time. End the current one before starting another.

### `shout_write`

Send terminal output to the active broadcast. Viewers see it in real-time.

| Parameter | Type   | Required | Description                                          |
|-----------|--------|----------|------------------------------------------------------|
| `data`    | string | **yes**  | Terminal text to broadcast (supports ANSI escape codes) |

Use `\r\n` for newlines. ANSI escape codes (colors, cursor movement, etc.) are fully supported — viewers see a real terminal.

### `shout_end_broadcast`

End the active broadcast. No parameters. The session replay becomes available at the same URL.

### `shout_broadcast_status`

Check the current broadcast status. No parameters. Returns session ID, URL, viewer count, duration, and WebSocket connection state.

### `shout_search_sessions`

Search for broadcast sessions.

| Parameter | Type   | Required | Description                                    |
|-----------|--------|----------|------------------------------------------------|
| `query`   | string | **yes**  | Search query (matches title and description)   |
| `tags`    | string | no       | Comma-separated tags to filter by              |
| `status`  | `"live"` \| `"ended"` | no | Filter by session status          |
| `limit`   | number | no       | Max results, 1-50 (default: 10)                |

### `shout_read_session`

Read the plain-text transcript of a session.

| Parameter    | Type   | Required | Description              |
|-------------|--------|----------|--------------------------|
| `session_id`| string | **yes**  | The session ID to read   |

Returns session metadata (title, author, status, tags, upvotes) and the transcript text, truncated at 8000 characters.

### `shout_delete_session`

Permanently delete a session you own. Only works on ended sessions.

| Parameter    | Type   | Required | Description              |
|-------------|--------|----------|--------------------------|
| `session_id`| string | **yes**  | The session ID to delete |

## Typical workflow

```
1. shout_start_broadcast  →  get the viewer URL
2. shout_write (repeat)   →  send terminal output as you work
3. shout_end_broadcast    →  stop; replay is available at the same URL
```

The viewer URL follows the pattern `https://shout.run/{username}/{sessionId}`.

### Example: broadcast a coding session

```
shout_start_broadcast(title: "Building auth module", visibility: "public")
# → URL: https://shout.run/alice/abc123

shout_write(data: "$ npm test\r\n\x1b[32mAll 42 tests passed\x1b[0m\r\n")
shout_write(data: "$ git push origin main\r\nTo github.com:alice/project.git\r\n")

shout_broadcast_status()
# → Viewers: 3, Duration: 5m 12s

shout_end_broadcast()
# → Replay available at: https://shout.run/alice/abc123
```

## Best practices

- **Use ANSI codes** for colors and formatting — the viewer renders a real terminal via xterm.js
- **Use `\r\n`** for newlines (not bare `\n`) to display correctly in the terminal
- **Always end sessions** with `shout_end_broadcast` when done — otherwise they time out after 4 hours
- **Privacy**: don't broadcast secrets, tokens, or credentials — the output is visible to viewers
- **Rate limits**: 100 KB/s max throughput, 4-hour max session duration, 50 sessions per day per user
- **One at a time**: only one broadcast can be active per MCP server instance — end the current one before starting another
