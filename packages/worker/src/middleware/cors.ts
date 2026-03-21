import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:3000',
      'https://shout.run',
      'https://www.shout.run',
    ];
    if (allowed.includes(origin)) return origin;
    // Allow Vercel preview deployments
    if (origin.endsWith('.vercel.app')) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
});
