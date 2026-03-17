<div align="center">
  <a href="https://shout.run">
    <img src="https://raw.githubusercontent.com/pavanmadiraju91/shout-run/main/packages/web/public/logo.png" alt="shout.run" width="120" />
  </a>
  <h1>shout-run-mcp</h1>
</div>

MCP server for [shout.run](https://shout.run) — live terminal broadcasting for AI agents.

Let your AI agents broadcast terminal output so humans can watch in real-time.

## Install

```bash
pip install shout-run-mcp
```

Or run directly with `uvx`:

```bash
uvx shout-run-mcp
```

## Setup

Get an API key at [shout.run](https://shout.run), then configure your MCP client.

### Claude Code

Add to your Claude Code settings (`~/.claude.json` or project `.claude/settings.json`):

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

### Cursor

Add to `.cursor/mcp.json`:

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

### With pip install

If you installed via pip instead of using uvx:

```json
{
  "mcpServers": {
    "shout": {
      "command": "shout-mcp",
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
| `shout_start_broadcast` | Start broadcasting — creates a session and returns the viewer URL |
| `shout_write` | Send terminal output to the broadcast (supports ANSI codes) |
| `shout_end_broadcast` | End the active broadcast |
| `shout_broadcast_status` | Check session state, viewer count, and duration |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOUT_API_KEY` | Yes | Your shout.run API key |
| `SHOUT_API_URL` | No | API base URL (default: `https://api.shout.run`) |

## License

MIT
