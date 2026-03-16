import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import type { DeviceCodeResponse, ApiResponse, AuthTokens } from '@shout/shared';
import { saveToken, isLoggedIn, removeToken } from '../lib/auth.js';

const API_BASE = process.env.SHOUT_API_URL ?? 'https://api.shout.run';

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(`${API_BASE}/api/auth/device-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get device code: ${response.status}`);
  }

  const result = (await response.json()) as ApiResponse<DeviceCodeResponse>;
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? 'Failed to get device code');
  }

  return result.data;
}

async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<AuthTokens | null> {
  const startTime = Date.now();
  const expiresAt = startTime + expiresIn * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    const response = await fetch(`${API_BASE}/api/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_code: deviceCode }),
    });

    const result = (await response.json()) as ApiResponse<AuthTokens>;

    if (result.ok && result.data) {
      return result.data;
    }

    if (result.error) {
      if (result.error === 'authorization_pending') {
        continue;
      }
      if (result.error === 'slow_down') {
        interval += 5;
        continue;
      }
      if (result.error === 'expired_token') {
        return null;
      }
      if (result.error === 'access_denied') {
        throw new Error('Authorization denied by user');
      }
      throw new Error(result.error);
    }
  }

  return null;
}

export async function login(): Promise<void> {
  // Check if already logged in
  if (await isLoggedIn()) {
    console.log(chalk.yellow('Already logged in. Use `shout logout` first to switch accounts.'));
    return;
  }

  const spinner = ora('Connecting to shout server...').start();

  try {
    const deviceCode = await requestDeviceCode();
    spinner.stop();

    console.log();
    console.log(chalk.bold('To authenticate, please:'));
    console.log();
    console.log(`  1. Open ${chalk.cyan(deviceCode.verification_uri)}`);
    console.log(`  2. Enter code: ${chalk.bold.green(deviceCode.user_code)}`);
    console.log();

    // Try to open browser
    try {
      await open(deviceCode.verification_uri);
      console.log(chalk.dim('(Opening browser automatically...)'));
    } catch {
      // Browser open failed, user can open manually
    }

    console.log();
    const pollSpinner = ora('Waiting for authorization...').start();

    const tokens = await pollForToken(
      deviceCode.device_code,
      deviceCode.interval,
      deviceCode.expires_in,
    );

    if (!tokens) {
      pollSpinner.fail('Authorization expired. Please try again.');
      process.exit(1);
    }

    await saveToken(tokens);

    pollSpinner.succeed(`Logged in as ${chalk.bold(tokens.username)}`);
  } catch (error) {
    spinner.fail('Login failed');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}

export async function logout(): Promise<void> {
  await removeToken();
  console.log(chalk.green('Logged out successfully.'));
}
