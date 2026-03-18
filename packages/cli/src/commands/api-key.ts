import chalk from 'chalk';
import { getToken } from '../lib/auth.js';
import type { ApiResponse, ApiKey, CreateApiKeyResponse } from '@shout/shared';

const API_BASE = process.env.SHOUT_API_URL ?? 'https://api.shout.run';

async function requireAuth(): Promise<string> {
  const tokens = await getToken();
  if (!tokens || !tokens.accessToken) {
    console.log(chalk.yellow('Not logged in. Run `shout login` first.'));
    process.exit(1);
  }
  return tokens.accessToken;
}

export async function createApiKey(name: string): Promise<void> {
  const token = await requireAuth();

  const res = await fetch(`${API_BASE}/api/keys`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  const body = (await res.json()) as ApiResponse<CreateApiKeyResponse>;

  if (!body.ok || !body.data) {
    console.log(chalk.red(`Error: ${body.error ?? 'Failed to create API key'}`));
    process.exit(1);
  }

  console.log();
  console.log(chalk.green('API key created successfully!'));
  console.log();
  console.log(`  Name:  ${body.data.name}`);
  console.log(`  Key:   ${chalk.bold(body.data.key)}`);
  console.log();
  console.log(chalk.dim('Save this key — it won\'t be shown again.'));
  console.log();
}

export async function listApiKeys(): Promise<void> {
  const token = await requireAuth();

  const res = await fetch(`${API_BASE}/api/keys`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = (await res.json()) as ApiResponse<ApiKey[]>;

  if (!body.ok || !body.data) {
    console.log(chalk.red(`Error: ${body.error ?? 'Failed to list API keys'}`));
    process.exit(1);
  }

  if (body.data.length === 0) {
    console.log(chalk.dim('No API keys. Create one with `shout api-key create <name>`.'));
    return;
  }

  console.log();
  console.log(chalk.bold('Your API keys:'));
  console.log();

  const nameWidth = Math.max(4, ...body.data.map((k) => k.name.length));

  console.log(
    `  ${chalk.dim('ID'.padEnd(8))}  ${chalk.dim('Name'.padEnd(nameWidth))}  ${chalk.dim('Prefix'.padEnd(16))}  ${chalk.dim('Created')}`,
  );

  for (const key of body.data) {
    const created = new Date(key.createdAt).toLocaleDateString();
    console.log(
      `  ${key.id.padEnd(8)}  ${key.name.padEnd(nameWidth)}  ${key.prefix.padEnd(16)}  ${created}`,
    );
  }

  console.log();
}

export async function revokeApiKey(id: string): Promise<void> {
  const token = await requireAuth();

  const res = await fetch(`${API_BASE}/api/keys/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = (await res.json()) as ApiResponse;

  if (!body.ok) {
    console.log(chalk.red(`Error: ${body.error ?? 'Failed to revoke API key'}`));
    process.exit(1);
  }

  console.log(chalk.green(`API key ${id} revoked.`));
}
