import { Hono } from 'hono';
import { eq, and, ne } from 'drizzle-orm';
import type { Env } from '../env.js';
import { createDb, sessions, users } from '../lib/db.js';

const oembedRouter = new Hono<{ Bindings: Env }>();

// URL pattern: https://shout.run/{username}/{sessionId}
const SESSION_URL_RE = /^https?:\/\/(?:www\.)?shout\.run\/([^/]+)\/([a-z0-9]+)\/?$/;

oembedRouter.get('/', async (c) => {
  const url = c.req.query('url');
  const format = c.req.query('format') || 'json';

  if (!url) {
    return c.json({ error: 'Missing required parameter: url' }, 400);
  }

  if (format !== 'json') {
    return c.json({ error: 'Only JSON format is supported' }, 501);
  }

  const match = url.match(SESSION_URL_RE);
  if (!match) {
    return c.json({ error: 'Invalid URL format. Expected: https://shout.run/{username}/{sessionId}' }, 400);
  }

  const [, , sessionId] = match;

  const db = createDb(c.env.TURSO_URL, c.env.TURSO_AUTH_TOKEN);

  const result = await db
    .select({
      id: sessions.id,
      title: sessions.title,
      description: sessions.description,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.id, sessionId), eq(sessions.visibility, 'public'), ne(sessions.status, 'deleted')))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: 'Session not found' }, 404);
  }

  const session = result[0];

  // Respect maxwidth/maxheight from consumer
  const maxwidth = parseInt(c.req.query('maxwidth') || '800', 10) || 800;
  const maxheight = parseInt(c.req.query('maxheight') || '450', 10) || 450;
  const width = Math.min(maxwidth, 800);
  const height = Math.min(maxheight, 450);

  const embedUrl = `https://shout.run/embed/${sessionId}`;
  const html = `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allowfullscreen style="border:none;border-radius:8px;overflow:hidden;"></iframe>`;

  return c.json({
    version: '1.0',
    type: 'rich',
    title: session.title || `${session.username}'s session`,
    author_name: session.username,
    author_url: `https://shout.run/${session.username}`,
    provider_name: 'shout',
    provider_url: 'https://shout.run',
    html,
    width,
    height,
    thumbnail_url: session.avatarUrl,
  });
});

export { oembedRouter };
