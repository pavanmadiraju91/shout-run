# Contributing to shout

Thank you for your interest in contributing to shout, a live terminal broadcasting tool for developers. This guide will help you get started.

## Prerequisites

- Node.js >= 20
- pnpm (enable via Corepack: `corepack enable`)
- Git

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/pavanmadiraju91/shout-run.git
   cd shout-run
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy environment files:
   ```bash
   cp .env.example .env
   cp packages/web/.env.local.example packages/web/.env.local
   ```

4. Start development servers:
   ```bash
   pnpm dev
   ```

## Monorepo Structure

This is a pnpm monorepo managed by Turborepo. The packages must be built in a specific order due to dependencies.

| Package | Path | Description |
|---------|------|-------------|
| `@shout/shared` | `packages/shared/` | Types, binary WebSocket protocol, constants. **Must build first.** |
| `@shout/cli` | `packages/cli/` | Commander.js CLI for broadcasting terminal sessions |
| `@shout/worker` | `packages/worker/` | Cloudflare Workers + Durable Objects backend |
| `@shout/web` | `packages/web/` | Next.js 15 / React 19 frontend with xterm.js |

### Build Order

The shared package must be built before any other package:

```bash
pnpm --filter @shout/shared build   # Build shared first
pnpm build                          # Or build all (Turborepo handles order)
```

### Useful Commands

```bash
pnpm install        # Install all dependencies
pnpm build          # Build all packages
pnpm dev            # Run all dev servers in parallel
pnpm lint           # Lint all packages
pnpm typecheck      # Type-check all packages
pnpm clean          # Remove all dist/node_modules
```

## Branch Naming

Use descriptive branch names with the following prefixes:

- `feat/` - New features (e.g., `feat/session-replay`)
- `fix/` - Bug fixes (e.g., `fix/websocket-reconnect`)
- `docs/` - Documentation changes (e.g., `docs/api-reference`)

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation only changes
- `chore:` - Maintenance tasks, dependency updates, etc.
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `test:` - Adding or updating tests

Examples:
```
feat: add session replay functionality
fix: resolve WebSocket reconnection on network change
docs: update CLI usage examples
chore: update dependencies
```

## Pull Request Process

1. Create a branch from `main` using the naming conventions above.

2. Make your changes, ensuring:
   - Code passes linting (`pnpm lint`)
   - TypeScript compiles without errors (`pnpm typecheck`)
   - The project builds successfully (`pnpm build`)

3. Push your branch and open a pull request against `main`.

4. In your PR description:
   - Describe what changes you made and why
   - Reference any related issues
   - Include testing steps if applicable

5. Wait for CI to pass. All checks must be green before merging.

6. Request a review from a maintainer.

## Code Style

This project uses Prettier for consistent formatting with the following configuration:

- Semicolons: yes
- Quotes: single
- Trailing commas: yes
- Line width: 100 characters

### ESM and Import Extensions

All packages use ECMAScript modules (`"type": "module"`). When importing from TypeScript files, you must include the `.js` extension:

```typescript
// Correct
import { encodeFrame } from './protocol.js';

// Incorrect - will fail at runtime
import { encodeFrame } from './protocol';
```

## What NOT to Submit

To keep reviews focused and maintain project quality, please avoid:

- **Unrelated refactors** - Keep changes scoped to the issue or feature at hand
- **Dependency bumps without context** - If updating dependencies, explain why in the PR description and ensure nothing breaks
- **Formatting-only changes** - Run Prettier before committing; do not submit PRs that only fix formatting
- **Large changes without prior discussion** - For significant changes, open an issue first to discuss the approach

## Questions

If you have questions about contributing, feel free to open an issue for discussion.
