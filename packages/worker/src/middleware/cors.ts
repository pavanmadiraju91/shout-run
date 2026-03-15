import { cors } from 'hono/cors';

export const corsMiddleware = cors({
  origin: ['http://localhost:3000', 'https://shout.dev', 'https://www.shout.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Authorization', 'Content-Type'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
});
