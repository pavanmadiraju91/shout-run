/** Env var prefixes that should never be exposed to a broadcast shell. */
export const SENSITIVE_ENV_PREFIXES = [
  'AWS_SECRET',
  'AWS_SESSION_TOKEN',
  'DATABASE_URL',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'NPM_TOKEN',
  'NODE_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET',
  'PRIVATE_KEY',
  'SECRET_KEY',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'SESSION_SECRET',
  'COOKIE_SECRET',
  'TURSO_AUTH_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'SENTRY_AUTH_TOKEN',
  'SLACK_TOKEN',
  'SLACK_BOT_TOKEN',
  'DISCORD_TOKEN',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
  'MAILGUN_API_KEY',
];

/**
 * Strips sensitive env vars and undefined values from the env,
 * then adds SHOUT_SESSION=1.
 */
export function stripSensitiveEnv(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, val] of Object.entries(env)) {
    if (val === undefined) continue;
    const upper = key.toUpperCase();
    if (SENSITIVE_ENV_PREFIXES.some((prefix) => upper.startsWith(prefix))) continue;
    clean[key] = val;
  }
  clean.SHOUT_SESSION = '1';
  return clean;
}
