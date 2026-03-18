<div align="center">
  <a href="https://shout.run">
    <img src="https://shout.run/logo.png" alt="shout.run" width="120" />
  </a>
  <h1>shout-run-sdk</h1>
</div>

Python SDK for [shout.run](https://shout.run). Broadcast your terminal from code.

Write a script, pipe some output, and anyone with the link watches it live.

## Install

```bash
pip install shout-run-sdk
```

## Quick Start

```python
from shout_sdk import ShoutSession

session = ShoutSession(api_key='shout_sk_...')
info = session.start(title='My Agent Session')
print(f"Live at: {info['url']}")

session.write('Hello, world!\r\n')
# ... do work ...

session.end()
```

## Context Manager

```python
from shout_sdk import ShoutSession

with ShoutSession(api_key='shout_sk_...') as session:
    info = session.start(title='My Agent')
    session.write('Working...\r\n')
    # session.end() called automatically
```

## Getting an API Key

1. Log in to shout.run with GitHub
2. Create an API key:

```bash
curl -X POST https://api.shout.run/api/keys \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Agent"}'
```

The response includes your `key` — save it securely, it's shown only once.

## API Reference

### `ShoutSession(api_key, **kwargs)`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | *required* | API key (starts with `shout_sk_`) |
| `title` | `str` | `'SDK Session'` | Session title shown to viewers |
| `visibility` | `str` | `'public'` | `'public'`, `'followers'`, or `'private'` |
| `cols` | `int` | `80` | Terminal columns |
| `rows` | `int` | `24` | Terminal rows |
| `api_url` | `str` | `'https://api.shout.run'` | API base URL |

### Methods

- **`start()`** — Creates the session and connects WebSocket. Returns `{'session_id', 'url', 'ws_url'}`.
- **`write(data)`** — Sends terminal output (`str` or `bytes`). Automatically buffered, rate-limited, and chunked.
- **`resize(cols, rows)`** — Updates terminal dimensions.
- **`end()`** — Flushes buffer, sends end frame, closes session.

### Properties

- **`state`** — Current state: `SessionState.IDLE`, `.CONNECTING`, `.LIVE`, `.ENDING`, `.ENDED`
- **`viewers`** — Current viewer count
- **`session_id`** — Session ID (`None` before start)

### Events

```python
session.on('connected', lambda: print('Connected!'))
session.on('disconnected', lambda code, reason: print(f'Disconnected: {code}'))
session.on('reconnecting', lambda attempt: print(f'Reconnecting #{attempt}'))
session.on('viewers', lambda count: print(f'Viewers: {count}'))
session.on('error', lambda err: print(f'Error: {err}'))
session.on('state_change', lambda state: print(f'State: {state}'))
```

### Piping Subprocess Output

```python
import subprocess
from shout_sdk import ShoutSession

session = ShoutSession(api_key='shout_sk_...')
info = session.start(title='Running tests')

proc = subprocess.Popen(
    ['pytest', '-v'],
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
)

for line in proc.stdout:
    session.write(line)

proc.wait()
session.end()
```

## License

MIT
