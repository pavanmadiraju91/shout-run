<div align="center">
  <a href="https://shout.run">
    <img src="https://shout.run/logo.png" alt="shout.run" width="120" />
  </a>
  <h1>shout-run-mcp</h1>
</div>

MCP server for [shout.run](https://shout.run). Terminal broadcasting for AI agents.

Agents broadcast and viewers watch in a browser. Works with Claude Code, Cursor, Windsurf, and other MCP clients.

## Install

```bash
pip install shout-run-mcp
```

Or run directly with `uvx`:

```bash
uvx shout-run-mcp
```

## Setup

Get an API key with the CLI:

```bash
npm install -g shout-run
shout login
shout api-key create "My MCP Server"
```

The key is printed once. Save it somewhere safe. Keys start with `shout_sk_`.

Then configure your MCP client.

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
| `shout_delete_session` | Delete an ended session you own (permanent) |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SHOUT_API_KEY` | Yes | Your shout.run API key |
| `SHOUT_API_URL` | No | API base URL (default: `https://api.shout.run`) |

## License

MIT
