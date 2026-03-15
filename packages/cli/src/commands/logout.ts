import chalk from 'chalk';
import { removeToken, isLoggedIn } from '../lib/auth.js';

export async function logout(): Promise<void> {
  if (!(await isLoggedIn())) {
    console.log(chalk.yellow('Not currently logged in.'));
    return;
  }

  await removeToken();
  console.log(chalk.green('Logged out successfully.'));
}
