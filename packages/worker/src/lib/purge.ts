import { eq, and, lt } from 'drizzle-orm';
import type { Env } from '../env.js';
import { createDb, sessions } from './db.js';

const GRACE_PERIOD_DAYS = 7;
const BATCH_SIZE = 50;

export async function purgeDeletedSessions(env: Env): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - GRACE_PERIOD_DAYS);

  const db = createDb(env.TURSO_URL, env.TURSO_AUTH_TOKEN);

  // Find sessions soft-deleted more than 7 days ago
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.status, 'deleted'), lt(sessions.deletedAt, cutoff.toISOString())))
    .limit(BATCH_SIZE);

  for (const row of rows) {
    try {
      // 1. Clean DO storage (must call into the DO)
      const doId = env.SESSION_HUB.idFromName(row.id);
      const stub = env.SESSION_HUB.get(doId);
      await stub.fetch(new Request('https://do/cleanup', { method: 'DELETE' }));

      // 2. Delete R2 replay files
      const prefix = `sessions/${row.id}/`;
      const listed = await env.SESSIONS_BUCKET.list({ prefix });
      if (listed.objects.length > 0) {
        await env.SESSIONS_BUCKET.delete(listed.objects.map((o) => o.key));
      }

      // 3. Hard-delete from Turso
      await db.delete(sessions).where(eq(sessions.id, row.id));

      console.log(`Purged session ${row.id}`);
    } catch (err) {
      console.error(`Failed to purge session ${row.id}:`, err);
      // Continue with next session — don't let one failure block the batch
    }
  }
}
