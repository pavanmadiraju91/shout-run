import { eq, and, isNull } from 'drizzle-orm';
import { apiKeys, users } from './db.js';
import type { Database } from './db.js';
import type { AuthUser } from '../env.js';

const API_KEY_PREFIX = 'shout_sk_';

export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${API_KEY_PREFIX}${hex}`;
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function isApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

export function getApiKeyPrefix(key: string): string {
  return key.slice(0, 20);
}

export async function resolveApiKeyUser(
  db: Database,
  keyHash: string,
): Promise<AuthUser | null> {
  const result = await db
    .select({
      keyId: apiKeys.id,
      userId: users.id,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(apiKeys)
    .innerJoin(users, eq(apiKeys.userId, users.id))
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return {
    id: result[0].userId,
    username: result[0].username,
    avatarUrl: result[0].avatarUrl,
  };
}

export async function updateApiKeyLastUsed(
  db: Database,
  keyHash: string,
): Promise<void> {
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date().toISOString() })
    .where(eq(apiKeys.keyHash, keyHash));
}
