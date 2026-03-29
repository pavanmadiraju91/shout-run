import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import type { AuthTokens } from '@shout/shared';

const SERVICE_NAME = 'shout-cli';
const ACCOUNT_NAME = 'default';

const CONFIG_DIR = path.join(os.homedir(), '.shout');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface StoredConfig {
  accessToken: string;
  username: string;
  avatarUrl: string;
}

let keytar: typeof import('keytar') | null = null;

/**
 * Decode a JWT payload without verifying the signature.
 * Used to check the `exp` claim locally before making network calls.
 */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    return payload;
  } catch {
    return null;
  }
}

/** Returns true if the JWT's exp claim is in the past (or missing). */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp < Math.floor(Date.now() / 1000);
}

async function getKeytar(): Promise<typeof import('keytar') | null> {
  if (keytar !== null) return keytar;
  try {
    keytar = await import('keytar');
    return keytar;
  } catch {
    return null;
  }
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

function readConfigFile(): StoredConfig | null {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(data) as StoredConfig;
  } catch {
    return null;
  }
}

function writeConfigFile(config: StoredConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
}

function deleteConfigFile(): void {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fs.unlinkSync(CONFIG_FILE);
    }
  } catch {
    // Ignore errors
  }
}

export async function saveToken(tokens: AuthTokens): Promise<void> {
  const kt = await getKeytar();

  if (kt) {
    try {
      // Store token in OS keychain
      await kt.setPassword(SERVICE_NAME, ACCOUNT_NAME, tokens.accessToken);
      // Store metadata in config file (not sensitive)
      ensureConfigDir();
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify({ username: tokens.username, avatarUrl: tokens.avatarUrl }, null, 2),
        { mode: 0o600 },
      );
      return;
    } catch {
      // Fall through to file-based storage
    }
  }

  // Fallback: store everything in config file
  writeConfigFile({
    accessToken: tokens.accessToken,
    username: tokens.username,
    avatarUrl: tokens.avatarUrl,
  });
}

export async function getToken(): Promise<AuthTokens | null> {
  const kt = await getKeytar();

  if (kt) {
    try {
      const accessToken = await kt.getPassword(SERVICE_NAME, ACCOUNT_NAME);
      if (accessToken) {
        const config = readConfigFile();
        if (config?.username) {
          return {
            accessToken,
            username: config.username,
            avatarUrl: config.avatarUrl ?? '',
          };
        }
      }
    } catch {
      // Fall through to file-based storage
    }
  }

  // Fallback: read from config file
  const config = readConfigFile();
  if (config?.accessToken) {
    return {
      accessToken: config.accessToken,
      username: config.username,
      avatarUrl: config.avatarUrl,
    };
  }

  return null;
}

export async function removeToken(): Promise<void> {
  const kt = await getKeytar();

  if (kt) {
    try {
      await kt.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
    } catch {
      // Ignore errors
    }
  }

  deleteConfigFile();
}

export async function isLoggedIn(): Promise<boolean> {
  const tokens = await getToken();
  if (!tokens || !tokens.accessToken) return false;
  return !isTokenExpired(tokens.accessToken);
}
