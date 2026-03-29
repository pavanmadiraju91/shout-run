import chalk from 'chalk';
import { getToken, isLoggedIn } from '../lib/auth.js';

export async function whoami(): Promise<void> {
  const tokens = await getToken();

  if (!tokens || !tokens.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `shout login` to authenticate.'));
    process.exit(1);
  }

  const valid = await isLoggedIn();

  console.log();
  console.log(chalk.bold('Currently logged in as:'));
  console.log();
  console.log(`  Username: ${chalk.green(tokens.username)}`);
  if (tokens.avatarUrl) {
    console.log(`  Avatar:   ${chalk.dim(tokens.avatarUrl)}`);
  }
  if (!valid) {
    console.log();
    console.log(chalk.red('  Session expired. Run `shout logout && shout login` to re-authenticate.'));
  }
  console.log();
}
