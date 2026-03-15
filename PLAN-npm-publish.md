# Plan: Prepare `shout-cli` for npm Publishing

## Context
The CLI package (`packages/cli`) has the scaffolding for npm publishing (bin field, files field, publishConfig, CI workflow) but has one **critical blocker**: it depends on `@shout/shared` at runtime, which is `"private": true` and won't exist on npm. Users who `npm install -g shout-cli` will get a missing dependency error.

The fix is to **bundle** `@shout/shared` into the CLI dist using `tsup` (the modern 2025/2026 standard for bundling ESM CLI tools). We also need to fill in missing package.json metadata and add a README so the npm listing looks professional.

## What changes

### 1. Switch CLI build from `tsc` to `tsup` (bundle shared into CLI)

**Why:** `tsc` only transpiles — it emits `import ... from '@shout/shared'` verbatim. Since `@shout/shared` is private, npm users can't resolve it. `tsup` (powered by esbuild) inlines the shared code into the CLI bundle.

**File:** `packages/cli/package.json`
- Add `tsup` as a devDependency
- Change `"build": "tsc"` to `"build": "tsup"`
- Change `"dev": "tsc --watch"` to `"dev": "tsup --watch"`
- Move `@shout/shared` from `dependencies` to `devDependencies` (it gets bundled, not installed)
- Add `"prepublishOnly": "pnpm build"` script for safety

**File:** `packages/cli/tsup.config.ts` (new)
```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node20',
  dts: true,
  clean: true,
  splitting: false,
  banner: { js: '#!/usr/bin/env node' },
  // Bundle @shout/shared into output; keep other deps external
  noExternal: ['@shout/shared'],
});
```

**Key details:**
- `noExternal: ['@shout/shared']` — inlines only shared, keeps `commander`, `ws`, etc. as regular dependencies
- `banner` adds the shebang — tsup strips it by default
- `dts: true` generates type declarations
- Output goes to `dist/` (same as today)

**File:** `packages/cli/tsconfig.json` — keep as-is (tsup uses it for path resolution, `tsc --noEmit` still used for typecheck)

### 2. Add missing package.json metadata

**File:** `packages/cli/package.json` — add:
```json
"license": "MIT",
"author": "Pavan Madiraju",
"repository": {
  "type": "git",
  "url": "https://github.com/pavanmadiraju91/ideal-robot.git",
  "directory": "packages/cli"
},
"homepage": "https://shout.run",
"keywords": ["terminal", "broadcast", "cli", "streaming", "developer-tools", "live", "tty"]
```

### 3. Add CLI README

**File:** `packages/cli/README.md` (new) — a concise README with:
- One-liner description + what it does
- Install: `npm install -g shout-cli`
- Quick start: `shout login` then `shout` or `shout --title "my session"`
- Commands reference (login, logout, whoami, broadcast)
- Link to https://shout.run for the viewer
- License

### 4. Update CI workflow node version

**File:** `.github/workflows/publish-cli.yml`
- Bump `node-version: 20` to `node-version: 22` (current Active LTS as of 2026)

## Files modified
| File | Action |
|------|--------|
| `packages/cli/package.json` | Edit (build script, deps, metadata) |
| `packages/cli/tsup.config.ts` | Create |
| `packages/cli/README.md` | Create |
| `.github/workflows/publish-cli.yml` | Edit (node 22) |

## What stays the same
- `publishConfig.name: "shout-cli"` — keeps unscoped name
- `bin.shout: "./dist/index.js"` — same entry point
- `files: ["dist"]` — same publish files
- `engines.node: ">=20"` — still supports Node 20+
- Tag-triggered publish workflow (`cli-v*`) — same flow
- `packages/shared/` stays `private: true` — no need to publish it

## Verification
1. `pnpm --filter @shout/cli build` — should produce `dist/index.js` with shared code inlined
2. `grep '@shout/shared' packages/cli/dist/index.js` — should return nothing (shared is bundled)
3. `node packages/cli/dist/index.js --version` — prints version
4. `pnpm --filter @shout/cli pack` — inspect tarball to confirm no `@shout/shared` in `package.json` dependencies
5. `pnpm typecheck` — still passes
