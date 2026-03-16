import type { Context, Next } from 'hono';
import type { Env, AuthUser } from '../env.js';
import { verifyToken } from '../lib/jwt.js';
import { isApiKey, hashApiKey, resolveApiKeyUser, updateApiKeyLastUsed } from '../lib/api-keys.js';
import { createDb } from '../lib/db.js';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  if (isApiKey(token)) {
    // API key auth path
    const keyHash = await hashApiKey(token);
    const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
    const user = await resolveApiKeyUser(db, keyHash);

    if (!user) {
      return c.json({ ok: false, error: 'Invalid or revoked API key' }, 401);
    }

    c.set('user', user);

    // Update last used timestamp in background
    c.executionCtx.waitUntil(updateApiKeyLastUsed(db, keyHash));

    await next();
    return;
  }

  // JWT auth path (unchanged)
  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ ok: false, error: 'Invalid or expired token' }, 401);
  }

  const user: AuthUser = {
    id: payload.sub,
    username: payload.username,
    avatarUrl: payload.avatarUrl,
  };

  c.set('user', user);
  await next();
}

export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);

    if (isApiKey(token)) {
      // API key auth path
      const keyHash = await hashApiKey(token);
      const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
      const user = await resolveApiKeyUser(db, keyHash);

      if (user) {
        c.set('user', user);
        c.executionCtx.waitUntil(updateApiKeyLastUsed(db, keyHash));
      }
    } else {
      // JWT auth path (unchanged)
      const payload = await verifyToken(token, c.env.JWT_SECRET);

      if (payload) {
        const user: AuthUser = {
          id: payload.sub,
          username: payload.username,
          avatarUrl: payload.avatarUrl,
        };
        c.set('user', user);
      }
    }
  }

  await next();
}
