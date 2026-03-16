import { Hono } from 'hono';
import type { Env } from './env.js';
import { corsMiddleware } from './middleware/cors.js';
import { auth } from './routes/auth.js';
import { sessionsRouter } from './routes/sessions.js';
import { oembedRouter } from './routes/oembed.js';
import { keysRouter } from './routes/keys.js';

// Re-export Durable Object
export { SessionHub } from './durable-objects/SessionHub.js';

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', corsMiddleware);

// Health check
app.get('/health', (c) => {
  return c.json({ ok: true, timestamp: new Date().toISOString() });
});

// Mount routes
app.route('/api/auth', auth);
app.route('/api/sessions', sessionsRouter);
app.route('/api/keys', keysRouter);
app.route('/api/oembed', oembedRouter);

// User sessions route (different path structure)
app.get('/api/users/:username/sessions', async (c) => {
  // Forward to sessions router
  const username = c.req.param('username');
  const url = new URL(c.req.url);
  url.pathname = `/api/sessions/user/${username}`;
  return app.fetch(new Request(url.toString(), c.req.raw), c.env, c.executionCtx);
});

// 404 handler
app.notFound((c) => {
  return c.json({ ok: false, error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ ok: false, error: 'Internal Server Error' }, 500);
});

// Export for Cloudflare Workers
export default app;
