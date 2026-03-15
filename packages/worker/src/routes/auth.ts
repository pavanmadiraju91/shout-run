import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import type { Env } from '../env.js';
import { createDb, users, generateId } from '../lib/db.js';
import { createToken, verifyToken } from '../lib/jwt.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  GITHUB_DEVICE_CODE_URL,
  GITHUB_ACCESS_TOKEN_URL,
  GITHUB_USER_URL,
} from '@shout/shared';
import type { DeviceCodeResponse, TokenResponse, ApiResponse, AuthTokens } from '@shout/shared';

const auth = new Hono<{ Bindings: Env }>();

// ── CLI Device Flow ───────────────────────────────────────────

// POST /api/auth/device-code - Request device code from GitHub
auth.post('/device-code', async (c) => {
  const response = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      scope: 'read:user',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return c.json<ApiResponse>({ ok: false, error: `GitHub error: ${errorText}` }, 500);
  }

  const data = (await response.json()) as DeviceCodeResponse;
  return c.json<ApiResponse<DeviceCodeResponse>>({ ok: true, data });
});

// POST /api/auth/token - Exchange device code for access token
auth.post('/token', async (c) => {
  const body = await c.req.json<{ device_code: string }>();

  if (!body.device_code) {
    return c.json<ApiResponse>({ ok: false, error: 'device_code is required' }, 400);
  }

  // Exchange device code for access token
  const tokenResponse = await fetch(GITHUB_ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      device_code: body.device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    return c.json<ApiResponse>({ ok: false, error: `GitHub error: ${errorText}` }, 500);
  }

  const tokenData = (await tokenResponse.json()) as TokenResponse & {
    error?: string;
    error_description?: string;
  };

  // GitHub returns 200 with error field when authorization is pending
  if (tokenData.error) {
    if (tokenData.error === 'authorization_pending') {
      return c.json<ApiResponse>({ ok: false, error: 'authorization_pending' }, 202);
    }
    if (tokenData.error === 'slow_down') {
      return c.json<ApiResponse>({ ok: false, error: 'slow_down' }, 429);
    }
    if (tokenData.error === 'expired_token') {
      return c.json<ApiResponse>({ ok: false, error: 'expired_token' }, 410);
    }
    if (tokenData.error === 'access_denied') {
      return c.json<ApiResponse>({ ok: false, error: 'access_denied' }, 403);
    }
    return c.json<ApiResponse>(
      { ok: false, error: tokenData.error_description || tokenData.error },
      400,
    );
  }

  if (!tokenData.access_token) {
    return c.json<ApiResponse>({ ok: false, error: 'No access token received' }, 500);
  }

  // Fetch GitHub user info
  const userResponse = await fetch(GITHUB_USER_URL, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${tokenData.access_token}`,
      'User-Agent': 'shout-worker',
    },
  });

  if (!userResponse.ok) {
    const errorText = await userResponse.text();
    return c.json<ApiResponse>({ ok: false, error: `GitHub user fetch error: ${errorText}` }, 500);
  }

  const githubUser = (await userResponse.json()) as {
    id: number;
    login: string;
    avatar_url: string;
  };

  // Create or update user in database
  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  let user = await db.query.users.findFirst({
    where: eq(users.githubId, githubUser.id),
  });

  const now = new Date().toISOString();

  if (!user) {
    // Create new user
    const newUser = {
      id: generateId(),
      githubId: githubUser.id,
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
      createdAt: now,
      settings: null,
    };

    await db.insert(users).values(newUser);
    user = newUser;
  } else {
    // Update existing user info (avatar, username might change)
    await db
      .update(users)
      .set({
        username: githubUser.login,
        avatarUrl: githubUser.avatar_url,
      })
      .where(eq(users.id, user.id));

    user = {
      ...user,
      username: githubUser.login,
      avatarUrl: githubUser.avatar_url,
    };
  }

  // Create JWT token
  const jwt = await createToken(
    {
      sub: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
    },
    c.env.JWT_SECRET,
  );

  return c.json<ApiResponse<AuthTokens>>({
    ok: true,
    data: {
      accessToken: jwt,
      username: user.username,
      avatarUrl: user.avatarUrl,
    },
  });
});

// GET /api/auth/me - Get current user info
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');

  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const dbUser = await db.query.users.findFirst({
    where: eq(users.id, user.id),
  });

  if (!dbUser) {
    return c.json<ApiResponse>({ ok: false, error: 'User not found' }, 404);
  }

  return c.json<ApiResponse>({
    ok: true,
    data: {
      id: dbUser.id,
      username: dbUser.username,
      avatarUrl: dbUser.avatarUrl,
      createdAt: dbUser.createdAt,
    },
  });
});

export { auth };
