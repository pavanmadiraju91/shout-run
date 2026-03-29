declare const __CLI_VERSION__: string;

import { Command } from 'commander';
import { login } from './commands/login.js';
import { logout } from './commands/logout.js';
import { whoami } from './commands/whoami.js';
import { broadcast } from './commands/broadcast.js';
import { createApiKey, listApiKeys, revokeApiKey } from './commands/api-key.js';

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
  .option('--no-redact', 'Disable secret redaction in broadcast stream')
  .option('--redact-file <path>', 'Load additional secrets from a .env file')
  .option('--redact-value <value...>', 'Add individual secret values to redact')
  .action(async (options: { title?: string; visibility?: string; tags?: string; redact?: boolean; redactFile?: string; redactValue?: string[] }) => {
    await broadcast({
      title: options.title,
      visibility: options.visibility as 'public' | 'followers' | 'private' | undefined,
      tags: options.tags?.split(',').map((t) => t.trim()),
      noRedact: options.redact === false,
      redactFile: options.redactFile,
      redactValue: options.redactValue,
    });
  });

const apiKey = program.command('api-key').description('Manage API keys for SDK and MCP access');

apiKey
  .command('create <name>')
  .description('Create a new API key')
  .action(async (name: string) => {
    await createApiKey(name);
  });

apiKey
  .command('list')
  .description('List your API keys')
  .action(async () => {
    await listApiKeys();
  });

apiKey
  .command('revoke <id>')
  .description('Revoke an API key')
  .action(async (id: string) => {
    await revokeApiKey(id);
  });

// Detect if stdin is piped with no explicit command
const hasExplicitCommand = process.argv.length > 2 &&
  ['login', 'logout', 'whoami', 'broadcast', 'api-key'].includes(process.argv[2]);
const isPiped = !process.stdin.isTTY;

if (isPiped && !hasExplicitCommand) {
  // Insert 'broadcast' command so Commander parses flags like --title correctly
  process.argv.splice(2, 0, 'broadcast');
}

program.parse();
