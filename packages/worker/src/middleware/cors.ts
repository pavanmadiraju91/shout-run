import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: (origin) => {
    const allowed = [
      'http://localhost:3000',
      'https://shout.dev',
      'https://www.shout.dev',
    ];
    // Allow exact matches
    if (allowed.includes(origin)) return origin;
    // Allow Vercel preview/production deployments
    if (origin.endsWith('.vercel.app')) return origin;
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
});
