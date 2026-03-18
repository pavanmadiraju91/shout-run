# shout.run CLI

Live terminal broadcasting for developers. Share your terminal with anyone who has a browser.

## Install

```bash
npm install -g shout-run
```

## Quick start

```bash
shout login          # authenticate with GitHub
shout                # start broadcasting (interactive)
```

Your session goes live instantly at `https://shout.run/<username>/<session-id>`.

## Commands

| Command | Description |
|---------|-------------|
| `shout` | Start broadcasting (default command) |
| `shout login` | Authenticate with GitHub |
| `shout logout` | Remove stored credentials |
| `shout whoami` | Display current logged-in user |

### Broadcast options

```bash
shout --title "Building a CLI"       # set session title
shout --visibility private           # public (default) or private
shout --tags "rust,cli,demo"         # comma-separated tags
```

### Pipe mode

```bash
cargo test 2>&1 | shout --title "Test run"
```

## How it works

The CLI captures your terminal output via a PTY, streams it over WebSocket to the shout.run relay, and viewers watch in real-time through a web terminal.

## Requirements

- Node.js >= 20
- macOS, Linux, or Windows

## Links

- Website: [shout.run](https://shout.run)
- GitHub: [github.com/pavanmadiraju91/shout-run](https://github.com/pavanmadiraju91/shout-run)

## License

MIT
