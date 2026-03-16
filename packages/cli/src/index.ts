declare const __CLI_VERSION__: string;

import { Command } from 'commander';
import { login } from './commands/login.js';
import { logout } from './commands/logout.js';
import { whoami } from './commands/whoami.js';
import { broadcast } from './commands/broadcast.js';

const program = new Command();

program
  .name('shout')
  .description('Live terminal broadcasting for developers')
  .version(__CLI_VERSION__);

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
  .description('Start broadcasting your terminal')
  .option('-t, --title <title>', 'Session title')
  .option('-v, --visibility <visibility>', 'Visibility: public, followers, private')
  .option('--tags <tags>', 'Comma-separated tags')
  .action(async (options: { title?: string; visibility?: string; tags?: string }) => {
    await broadcast({
      title: options.title,
      visibility: options.visibility as 'public' | 'followers' | 'private' | undefined,
      tags: options.tags?.split(',').map((t) => t.trim()),
    });
  });

// Detect if stdin is piped with no explicit command
const hasExplicitCommand = process.argv.length > 2 &&
  ['login', 'logout', 'whoami', 'broadcast'].includes(process.argv[2]);
const isPiped = !process.stdin.isTTY;

if (isPiped && !hasExplicitCommand) {
  // Insert 'broadcast' command so Commander parses flags like --title correctly
  process.argv.splice(2, 0, 'broadcast');
}

program.parse();
