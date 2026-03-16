import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import type { Env } from '../env.js';
import { createDb, apiKeys, generateId } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateApiKey, hashApiKey, getApiKeyPrefix } from '../lib/api-keys.js';
import type { ApiResponse, ApiKey, CreateApiKeyRequest, CreateApiKeyResponse } from '@shout/shared';

const keysRouter = new Hono<{ Bindings: Env }>();

// POST /api/keys - Create a new API key
keysRouter.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req
    .json<CreateApiKeyRequest>()
    .catch(() => ({} as Partial<CreateApiKeyRequest>));

  const name = body.name?.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 64);
  if (!name) {
    return c.json<ApiResponse>({ ok: false, error: 'Name is required' }, 400);
  }

  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  // Limit to 10 active keys per user
  const existingKeys = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)));

  if (existingKeys.length >= 10) {
    return c.json<ApiResponse>({ ok: false, error: 'Maximum 10 active API keys allowed' }, 400);
  }

  const rawKey = generateApiKey();
  const keyHash = await hashApiKey(rawKey);
  const prefix = getApiKeyPrefix(rawKey);
  const id = generateId();
  const now = new Date().toISOString();

  await db.insert(apiKeys).values({
    id,
    userId: user.id,
    name,
    keyHash,
    prefix,
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
  });

  return c.json<ApiResponse<CreateApiKeyResponse>>({
    ok: true,
    data: { id, name, prefix, key: rawKey },
  });
});

// GET /api/keys - List user's active API keys
keysRouter.get('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const keys = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
    })
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), isNull(apiKeys.revokedAt)));

  const keyList: ApiKey[] = keys.map((k) => ({
    id: k.id,
    name: k.name,
    prefix: k.prefix,
    createdAt: k.createdAt,
    lastUsedAt: k.lastUsedAt || undefined,
  }));

  return c.json<ApiResponse<ApiKey[]>>({ ok: true, data: keyList });
});

// DELETE /api/keys/:id - Revoke an API key
keysRouter.delete('/:id', authMiddleware, async (c) => {
  const keyId = c.req.param('id')!;
  const user = c.get('user');
  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, keyId), eq(apiKeys.userId, user.id)),
  });

  if (!key) {
    return c.json<ApiResponse>({ ok: false, error: 'API key not found' }, 404);
  }

  if (key.revokedAt) {
    return c.json<ApiResponse>({ ok: true, data: { already: true } });
  }

  await db
    .update(apiKeys)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(apiKeys.id, keyId));

  return c.json<ApiResponse>({ ok: true, data: { revoked: true } });
});

export { keysRouter };
