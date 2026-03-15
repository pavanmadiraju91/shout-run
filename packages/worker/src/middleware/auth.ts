import type { Context, Next } from 'hono';
import type { Env, AuthUser } from '../env.js';
import { verifyToken } from '../lib/jwt.js';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ ok: false, error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
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

  await next();
}
