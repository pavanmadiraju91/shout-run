#!/usr/bin/env node

import { createRequire } from 'node:module';
import { Command } from 'commander';
import { login } from './commands/login.js';
import { logout } from './commands/logout.js';
import { whoami } from './commands/whoami.js';
import { broadcast } from './commands/broadcast.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('shout')
  .description('Live terminal broadcasting for developers')
  .version(pkg.version);

program
  .command('login')
  .description('Authenticate with GitHub')
  .action(async () => {
    await login();
  });

program
  .command('logout')
  .description('Remove stored credentials')
  .action(async () => {
    await logout();
  });

program
  .command('whoami')
  .description('Display current logged-in user')
  .action(async () => {
    await whoami();
  });

program
  .command('broadcast', { isDefault: true })
  .description('Start broadcasting (default when stdin is piped)')
  .option('-t, --title <title>', 'Session title')
  .option('-v, --visibility <visibility>', 'Visibility: public, followers, private', 'public')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (options: { title?: string; visibility?: string; tags?: string }) => {
    await broadcast({
      title: options.title,
      visibility: options.visibility as 'public' | 'followers' | 'private' | undefined,
      tags: options.tags?.split(',').map((t) => t.trim()),
    });
  });

// Detect if stdin is piped and no command given
const hasCommand = process.argv.length > 2 && !process.argv[2].startsWith('-');
const isPiped = !process.stdin.isTTY;

if (isPiped && !hasCommand) {
  // Auto-run broadcast when piped
  broadcast().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  program.parse();
}
