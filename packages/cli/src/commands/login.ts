import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import {
  GITHUB_DEVICE_CODE_URL,
  GITHUB_ACCESS_TOKEN_URL,
  GITHUB_USER_URL,
  type DeviceCodeResponse,
  type TokenResponse,
} from '@shout/shared';
import { saveToken, isLoggedIn } from '../lib/auth.js';

const GITHUB_CLIENT_ID = process.env.SHOUT_GITHUB_CLIENT_ID ?? 'Ov23liJLOo5RYnVvvvvv';

interface GitHubUser {
  login: string;
  avatar_url: string;
}

async function requestDeviceCode(): Promise<DeviceCodeResponse> {
  const response = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope: 'read:user',
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get device code: ${response.status}`);
  }

  return (await response.json()) as DeviceCodeResponse;
}

async function pollForToken(
  deviceCode: string,
  interval: number,
  expiresIn: number,
): Promise<TokenResponse | null> {
  const startTime = Date.now();
  const expiresAt = startTime + expiresIn * 1000;

  while (Date.now() < expiresAt) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    const response = await fetch(GITHUB_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    const data = (await response.json()) as
      | TokenResponse
      | { error: string; error_description?: string };

    if ('access_token' in data) {
      return data;
    }

    if ('error' in data) {
      if (data.error === 'authorization_pending') {
        continue;
      }
      if (data.error === 'slow_down') {
        // Increase interval by 5 seconds as per RFC 8628
        interval += 5;
        continue;
      }
      if (data.error === 'expired_token') {
        return null;
      }
      if (data.error === 'access_denied') {
        throw new Error('Authorization denied by user');
      }
      throw new Error(data.error_description ?? data.error);
    }
  }

  return null;
}

async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status}`);
  }

  return (await response.json()) as GitHubUser;
}

export async function login(): Promise<void> {
  // Check if already logged in
  if (await isLoggedIn()) {
    console.log(chalk.yellow('Already logged in. Use `shout logout` first to switch accounts.'));
    return;
  }

  const spinner = ora('Requesting device code from GitHub...').start();

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

    const token = await pollForToken(
      deviceCode.device_code,
      deviceCode.interval,
      deviceCode.expires_in,
    );

    if (!token) {
      pollSpinner.fail('Authorization expired. Please try again.');
      process.exit(1);
    }

    pollSpinner.text = 'Fetching user info...';

    const user = await fetchGitHubUser(token.access_token);

    await saveToken({
      accessToken: token.access_token,
      username: user.login,
      avatarUrl: user.avatar_url,
    });

    pollSpinner.succeed(`Logged in as ${chalk.bold(user.login)}`);
  } catch (error) {
    spinner.fail('Login failed');
    console.error(chalk.red(error instanceof Error ? error.message : 'Unknown error'));
    process.exit(1);
  }
}
