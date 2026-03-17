<div align="center">
  <a href="https://shout.run">
    <img src="https://raw.githubusercontent.com/pavanmadiraju91/shout-run/main/packages/web/public/logo.png" alt="shout.run" width="120" />
  </a>
  <h1>shout-run-mcp</h1>
</div>

MCP server for [shout.run](https://shout.run) — let AI agents broadcast terminal sessions.

Connects to any MCP-compatible client (Claude Code, Cursor, Windsurf, etc.) and exposes tools for live terminal broadcasting. Viewers watch at shout.run in real-time.

## Setup

### Claude Code

Add to your Claude Code settings (`.claude/settings.json`):

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

### Cursor

Add to `.cursor/mcp.json`:

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

## Tools

| Tool | Description |
|------|-------------|
| `shout_start_broadcast` | Start a live broadcast (returns viewer URL) |
| `shout_write` | Send terminal output to viewers |
| `shout_end_broadcast` | End the active broadcast |
| `shout_broadcast_status` | Check broadcast status and viewer count |

## Getting an API Key

1. Log in at [shout.run](https://shout.run) with GitHub
2. Create a key via the API:

```bash
curl -X POST https://api.shout.run/api/keys \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My MCP Server"}'
```

Save the returned `key` — it's shown only once.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SHOUT_API_KEY` | Yes | — | API key (starts with `shout_sk_`) |
| `SHOUT_API_URL` | No | `https://api.shout.run` | API base URL |

## License

MIT
