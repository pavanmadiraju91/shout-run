export interface Env {
  // Durable Objects
  SESSION_HUB: DurableObjectNamespace;

  // R2 Storage (bound via wrangler.toml)
  SESSIONS_BUCKET: R2Bucket;

  // KV Namespaces
  RATE_LIMITS: KVNamespace;

  // Environment Variables
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  TURSO_URL: string;
  TURSO_AUTH_TOKEN: string;
  JWT_SECRET: string;
}

export interface JWTPayload {
  sub: string;
  username: string;
  avatarUrl: string;
  iat: number;
  exp: number;
}

export interface AuthUser {
  id: string;
  username: string;
  avatarUrl: string;
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser;
    db: ReturnType<typeof import('./lib/db.js').createDb>;
  }
}
