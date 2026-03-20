<div align="center">
  <a href="https://shout.run">
    <img src="https://shout.run/logo.png" alt="shout.run" width="120" />
  </a>
  <h1>shout-run-mcp</h1>
</div>

MCP server for [shout.run](https://shout.run). Terminal broadcasting for AI agents.

Works with Claude Code, Cursor, Windsurf, and other MCP clients. Agents broadcast and viewers watch in a browser.

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
| `shout_delete_session` | Delete an ended session you own (permanent) |

## Getting an API Key

```bash
npm install -g shout-run
shout login
shout api-key create "My MCP Server"
```

The key is printed once. Save it somewhere safe. Keys start with `shout_sk_`.

You can list your keys with `shout api-key list` and revoke one with `shout api-key revoke <id>`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SHOUT_API_KEY` | Yes | — | API key (starts with `shout_sk_`) |
| `SHOUT_API_URL` | No | `https://api.shout.run` | API base URL |

## License

MIT
