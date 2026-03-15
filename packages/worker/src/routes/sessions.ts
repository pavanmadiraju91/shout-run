import { Hono } from 'hono';
import { eq, desc, and, gte, sql } from 'drizzle-orm';
import type { Env } from '../env.js';
import { createDb, sessions, users, generateId } from '../lib/db.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import type {
  ApiResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  Session,
  SessionSummary,
} from '@shout/shared';
import { DEFAULT_RATE_LIMITS } from '@shout/shared';

const sessionsRouter = new Hono<{ Bindings: Env }>();

// POST /api/sessions - Create new session
sessionsRouter.post('/', authMiddleware, async (c) => {
  const user = c.get('user');
  const body = await c.req.json<CreateSessionRequest>().catch(() => ({} as Partial<CreateSessionRequest>));

  // --- Input validation ---
  const VALID_VISIBILITIES = ['public', 'followers', 'private'] as const;
  const visibility = body.visibility ?? 'public';
  if (!VALID_VISIBILITIES.includes(visibility as (typeof VALID_VISIBILITIES)[number])) {
    return c.json<ApiResponse>({ ok: false, error: 'Invalid visibility value' }, 400);
  }

  let title = body.title ?? `${user.username}'s session`;
  // Strip control characters and clamp length
  title = title.replace(/[\x00-\x1f\x7f]/g, '').slice(0, 256);

  let tags: string[] = [];
  if (body.tags) {
    if (!Array.isArray(body.tags) || body.tags.some((t) => typeof t !== 'string')) {
      return c.json<ApiResponse>({ ok: false, error: 'Tags must be an array of strings' }, 400);
    }
    if (body.tags.length > 5) {
      return c.json<ApiResponse>({ ok: false, error: 'Maximum 5 tags allowed' }, 400);
    }
    tags = body.tags.map((t) => t.slice(0, 32));
  }

  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  // --- Rate limit: max sessions per day ---
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), gte(sessions.startedAt, todayStart.toISOString())));

  if (countResult.count >= DEFAULT_RATE_LIMITS.maxSessionsPerDay) {
    return c.json<ApiResponse>({ ok: false, error: 'Daily session limit reached' }, 429);
  }

  const sessionId = generateId();
  const now = new Date().toISOString();

  const newSession = {
    id: sessionId,
    userId: user.id,
    title,
    status: 'live' as const,
    visibility,
    viewerCount: 0,
    tags: tags.length > 0 ? JSON.stringify(tags) : null,
    startedAt: now,
    endedAt: null,
  };

  await db.insert(sessions).values(newSession);

  // Get DO instance for this session
  const doId = c.env.SESSION_HUB.idFromName(sessionId);
  const doStub = c.env.SESSION_HUB.get(doId);

  // Initialize the DO with session info
  await doStub.fetch(
    new Request('https://internal/init', {
      method: 'POST',
      body: JSON.stringify({
        sessionId,
        userId: user.id,
        username: user.username,
        title: newSession.title,
      }),
    }),
  );

  // Generate WebSocket URL
  const host = c.req.header('Host') || 'localhost:8787';
  const protocol = host.includes('localhost') ? 'ws' : 'wss';
  const wsUrl = `${protocol}://${host}/api/sessions/${sessionId}/ws/broadcaster`;

  return c.json<ApiResponse<CreateSessionResponse>>({
    ok: true,
    data: {
      sessionId,
      wsUrl,
    },
  });
});

// GET /api/sessions/live - List all live sessions
sessionsRouter.get('/live', async (c) => {
  try {
    const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

    const liveSessions = await db
      .select({
        id: sessions.id,
        title: sessions.title,
        viewerCount: sessions.viewerCount,
        startedAt: sessions.startedAt,
        username: users.username,
        avatarUrl: users.avatarUrl,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.status, 'live'), eq(sessions.visibility, 'public')))
      .orderBy(desc(sessions.viewerCount))
      .limit(50);

    const summaries: SessionSummary[] = liveSessions.map((s) => ({
      id: s.id,
      title: s.title,
      viewerCount: s.viewerCount,
      startedAt: s.startedAt,
      username: s.username,
      avatarUrl: s.avatarUrl,
    }));

    return c.json<ApiResponse<SessionSummary[]>>({ ok: true, data: summaries });
  } catch {
    // DB not configured — return empty list for local dev
    return c.json<ApiResponse<SessionSummary[]>>({ ok: true, data: [] });
  }
});

// GET /api/sessions/:id - Get session details
sessionsRouter.get('/:id', optionalAuthMiddleware, async (c) => {
  const sessionId = c.req.param('id')!;
  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const result = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      title: sessions.title,
      status: sessions.status,
      visibility: sessions.visibility,
      viewerCount: sessions.viewerCount,
      tags: sessions.tags,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  if (result.length === 0) {
    return c.json<ApiResponse>({ ok: false, error: 'Session not found' }, 404);
  }

  const session = result[0];
  const currentUser = c.get('user');

  // Check visibility
  if (session.visibility === 'private' && session.userId !== currentUser?.id) {
    return c.json<ApiResponse>({ ok: false, error: 'Session not found' }, 404);
  }

  // TODO: For 'followers' visibility, check if current user follows the session owner

  const sessionData: Session & { username: string; avatarUrl: string } = {
    id: session.id,
    userId: session.userId,
    title: session.title,
    status: session.status as Session['status'],
    visibility: session.visibility as Session['visibility'],
    viewerCount: session.viewerCount,
    tags: session.tags ? JSON.parse(session.tags) : [],
    startedAt: session.startedAt,
    endedAt: session.endedAt || undefined,
    username: session.username,
    avatarUrl: session.avatarUrl,
  };

  return c.json<ApiResponse>({ ok: true, data: sessionData });
});

// GET /api/users/:username/sessions - Get user's sessions
sessionsRouter.get('/user/:username', async (c) => {
  const username = c.req.param('username')!;
  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return c.json<ApiResponse>({ ok: false, error: 'User not found' }, 404);
  }

  const userSessions = await db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      title: sessions.title,
      status: sessions.status,
      visibility: sessions.visibility,
      viewerCount: sessions.viewerCount,
      tags: sessions.tags,
      startedAt: sessions.startedAt,
      endedAt: sessions.endedAt,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.userId, user.id), eq(sessions.visibility, 'public')))
    .orderBy(desc(sessions.startedAt))
    .limit(50);

  const sessionList = userSessions.map((s) => ({
    id: s.id,
    userId: s.userId,
    title: s.title,
    status: s.status as Session['status'],
    visibility: s.visibility as Session['visibility'],
    viewerCount: s.viewerCount,
    tags: s.tags ? JSON.parse(s.tags) : [],
    startedAt: s.startedAt,
    endedAt: s.endedAt || undefined,
    username: s.username,
    avatarUrl: s.avatarUrl,
  }));

  return c.json<ApiResponse<Session[]>>({ ok: true, data: sessionList });
});

// WebSocket upgrade for broadcaster
sessionsRouter.get('/:id/ws/broadcaster', async (c) => {
  const sessionId = c.req.param('id')!;
  const upgradeHeader = c.req.header('Upgrade');

  if (upgradeHeader !== 'websocket') {
    return c.json<ApiResponse>({ ok: false, error: 'WebSocket upgrade required' }, 426);
  }

  // Validate auth token from query param
  const token = c.req.query('token');
  if (!token) {
    return c.json<ApiResponse>({ ok: false, error: 'Missing auth token' }, 401);
  }

  const { verifyToken } = await import('../lib/jwt.js');
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json<ApiResponse>({ ok: false, error: 'Invalid token' }, 401);
  }

  // Verify session belongs to this user
  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session || session.userId !== payload.sub) {
    return c.json<ApiResponse>({ ok: false, error: 'Session not found or unauthorized' }, 404);
  }

  // Forward to Durable Object
  const doId = c.env.SESSION_HUB.idFromName(sessionId);
  const doStub = c.env.SESSION_HUB.get(doId);

  const url = new URL(c.req.url);
  url.pathname = '/broadcaster';

  return doStub.fetch(new Request(url.toString(), c.req.raw));
});

// POST /api/sessions/:id/end - Explicitly end a session (called by CLI on shutdown)
sessionsRouter.post('/:id/end', authMiddleware, async (c) => {
  const sessionId = c.req.param('id')!;
  const user = c.get('user');
  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session || session.userId !== user.id) {
    return c.json<ApiResponse>({ ok: false, error: 'Session not found or unauthorized' }, 404);
  }

  if (session.status === 'ended') {
    return c.json<ApiResponse>({ ok: true, data: { already: true } });
  }

  // Update DB status
  await db
    .update(sessions)
    .set({ status: 'ended', endedAt: new Date().toISOString() })
    .where(eq(sessions.id, sessionId));

  // Tell the DO to persist replay data
  const doId = c.env.SESSION_HUB.idFromName(sessionId);
  const doStub = c.env.SESSION_HUB.get(doId);
  await doStub.fetch(new Request('https://internal/end', { method: 'POST' })).catch(() => {});

  return c.json<ApiResponse>({ ok: true, data: { ended: true } });
});

// GET /api/sessions/:id/replay - Get replay data for an ended session
sessionsRouter.get('/:id/replay', optionalAuthMiddleware, async (c) => {
  const sessionId = c.req.param('id')!;

  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) {
    return c.json<ApiResponse>({ ok: false, error: 'Session not found' }, 404);
  }

  // Private sessions require auth and ownership
  if (session.visibility === 'private') {
    const currentUser = c.get('user');
    if (!currentUser || currentUser.id !== session.userId) {
      return c.json<ApiResponse>({ ok: false, error: 'Session not found' }, 404);
    }
  }

  // Ask the Durable Object for its stored chunks
  const doId = c.env.SESSION_HUB.idFromName(sessionId);
  const doStub = c.env.SESSION_HUB.get(doId);

  const replayResponse = await doStub.fetch(
    new Request('https://internal/replay', { method: 'GET' }),
  );

  if (!replayResponse.ok) {
    return c.json<ApiResponse>({ ok: true, data: { chunks: [] } });
  }

  const replayData = await replayResponse.json();
  return c.json<ApiResponse>({ ok: true, data: replayData });
});

// WebSocket upgrade for viewer
sessionsRouter.get('/:id/ws/viewer', async (c) => {
  const sessionId = c.req.param('id')!;
  const upgradeHeader = c.req.header('Upgrade');

  if (upgradeHeader !== 'websocket') {
    return c.json<ApiResponse>({ ok: false, error: 'WebSocket upgrade required' }, 426);
  }

  // Verify session exists and is live
  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
  });

  if (!session) {
    return c.json<ApiResponse>({ ok: false, error: 'Session not found' }, 404);
  }

  // Forward to Durable Object
  const doId = c.env.SESSION_HUB.idFromName(sessionId);
  const doStub = c.env.SESSION_HUB.get(doId);

  const url = new URL(c.req.url);
  url.pathname = '/viewer';

  return doStub.fetch(new Request(url.toString(), c.req.raw));
});

export { sessionsRouter };
