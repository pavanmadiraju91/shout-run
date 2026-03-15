<div align="center">
  <h1>shout</h1>
  <p><strong>Live terminal broadcasting for developers</strong></p>
  <p>Broadcast your terminal to the world. Live.</p>
  <p>
    <a href="https://www.npmjs.com/package/@shout/cli"><img src="https://img.shields.io/npm/v/@shout/cli" alt="npm version" /></a>
    <a href="https://github.com/pavanmadiraju91/ideal-robot/actions/workflows/ci.yml"><img src="https://github.com/pavanmadiraju91/ideal-robot/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://github.com/pavanmadiraju91/ideal-robot/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="license" /></a>
  </p>
</div>

---

<!-- demo gif here -->

## The Gap

| Tool | What it is | Analogy |
|------|-----------|---------|
| **tmate** | Private terminal sharing for pair programming | Zoom call |
| **asciinema** | Record and replay terminal sessions | YouTube video |
| **shout** | Live public terminal broadcasting | Twitch stream |

**shout** fills the gap between private collaboration and recorded content. Share your terminal with the world in real-time.

## Quick Start

```bash
# Install globally
npm install -g @shout/cli

# Authenticate with GitHub
shout login

# Broadcast anything
echo "hello world" | shout

# Or broadcast a long-running command
npm run build | shout
```

Your terminal output is now live at `https://shout.dev/pavanmadiraju91`.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   Terminal                   Cloudflare Worker           Viewers    │
│                                                                     │
│   ┌─────────┐               ┌──────────────────┐       ┌─────────┐ │
│   │  shout  │──── stdin ───>│   WebSocket Hub  │<──────│ Browser │ │
│   │   CLI   │               │   + Turso DB     │       │   App   │ │
│   └─────────┘               └──────────────────┘       └─────────┘ │
│       │                            │                        │      │
│       │                            │                        │      │
│       └── secret detection ────────┴── real-time broadcast ─┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

### Pipe Any Command
```bash
# Build logs
npm run build | shout

# Test output
pytest -v | shout

# Deployment logs
kubectl apply -f deployment.yaml | shout

# Long-running processes
tail -f /var/log/app.log | shout
```

### Automatic Secret Detection
Sensitive data is automatically redacted before it ever leaves your machine:

| Pattern | Example | Redacted |
|---------|---------|----------|
| AWS Access Key | `AKIAIOSFODNN7EXAMPLE` | `[AWS_KEY]` |
| AWS Secret Key | `wJalrXUtnFEMI/K7MDENG/...` | `[AWS_SECRET]` |
| GitHub Token | `ghp_xxxxxxxxxxxx` | `[GITHUB_TOKEN]` |
| Stripe Key | `sk_live_xxxxxxxxxxxx` | `[STRIPE_KEY]` |
| Generic API Key | `api_key=secret123` | `api_key=[REDACTED]` |
| Passwords | `password: hunter2` | `password: [REDACTED]` |
| JWT Tokens | `eyJhbGciOiJIUzI1...` | `[JWT_TOKEN]` |
| Private Keys | `-----BEGIN RSA PRIVATE KEY-----` | `[PRIVATE_KEY]` |

### Live Viewer Count
See how many people are watching your stream in real-time.

```bash
shout --show-viewers
# Output includes: "3 viewers watching"
```

### Session Replay
Every broadcast is automatically saved. Viewers who arrive late can replay from the beginning.

### Mobile-Friendly Viewer
The web viewer works on any device with a responsive terminal display.

## Secret Detection

shout scans your output for sensitive patterns before transmission:

- **Cloud Credentials**: AWS, GCP, Azure keys and tokens
- **API Keys**: Stripe, SendGrid, Twilio, and generic patterns
- **Auth Tokens**: GitHub, GitLab, npm, PyPI tokens
- **Secrets**: Passwords, private keys, JWTs, bearer tokens
- **Connection Strings**: Database URLs with credentials

To see what patterns are detected:
```bash
shout patterns
```

To test detection on a file:
```bash
cat .env | shout --dry-run
```

## Self-Hosting

shout can be self-hosted entirely on Cloudflare's free tier:

1. **Clone the repository**
   ```bash
   git clone https://github.com/pavanmadiraju91/ideal-robot.git
   cd ideal-robot
   ```

2. **Set up Turso database**
   ```bash
   turso db create shout
   turso db tokens create shout
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Fill in your credentials
   ```

4. **Deploy the worker**
   ```bash
   cd packages/worker
   pnpm wrangler deploy
   ```

5. **Deploy the web app**
   ```bash
   cd packages/web
   vercel deploy --prod
   ```

## Add a Live Badge to Your README

Show your current broadcast status:

```markdown
[![shout](https://shout.dev/badge/pavanmadiraju91)](https://shout.dev/pavanmadiraju91)
```

When you're live, viewers see a pulsing "LIVE" badge. When offline, it shows your last broadcast time.

## CLI Reference

```
Usage: shout [options] [command]

Commands:
  login              Authenticate with GitHub
  logout             Clear stored credentials
  broadcast          Start broadcasting (default if stdin is piped)
  patterns           List detected secret patterns
  whoami             Show current user

Options:
  -t, --title        Set broadcast title
  -p, --private      Create private broadcast (link only)
  --show-viewers     Display viewer count
  --dry-run          Preview without broadcasting
  --no-redact        Disable secret detection (use with caution)
  -h, --help         Show help
  -v, --version      Show version
```

## Development

```bash
# Clone and install
git clone https://github.com/pavanmadiraju91/ideal-robot.git
cd ideal-robot
pnpm install

# Start development servers
pnpm dev

# Run tests
pnpm test

# Build all packages
pnpm build
```

### Project Structure

```
packages/
  cli/       # Command-line interface (@shout/cli)
  web/       # Next.js viewer app
  worker/    # Cloudflare Worker API
  shared/    # Shared types and utilities
```

## Contributing

Contributions are welcome! Please read our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start all services in development mode
pnpm dev
```

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p>Built with Cloudflare Workers, Turso, and Next.js</p>
  <p>
    <a href="https://shout.dev">Website</a> ·
    <a href="https://github.com/pavanmadiraju91/ideal-robot/issues">Issues</a> ·
    <a href="https://twitter.com/shoutdev">Twitter</a>
  </p>
</div>
