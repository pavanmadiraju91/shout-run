#!/usr/bin/env node

// Fix node-pty spawn-helper permissions after npm global install.
// npm strips execute bits from prebuilt binaries, causing posix_spawnp to fail.

import { readdirSync, chmodSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

try {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const prebuildsDir = join(__dirname, '..', 'node_modules', 'node-pty', 'prebuilds');

  let dirs;
  try {
    dirs = readdirSync(prebuildsDir);
  } catch {
    // node-pty or prebuilds dir doesn't exist — nothing to fix
    process.exit(0);
  }

  for (const platform of dirs) {
    const helper = join(prebuildsDir, platform, 'spawn-helper');
    try {
      statSync(helper);
      chmodSync(helper, 0o755);
    } catch {
      // spawn-helper doesn't exist for this platform — skip
    }
  }
} catch {
  // Non-blocking — don't break install if anything unexpected happens
}
