import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// ── Schema Definitions ────────────────────────────────────────

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  githubId: integer('github_id').unique().notNull(),
  username: text('username').unique().notNull(),
  avatarUrl: text('avatar_url').notNull(),
  createdAt: text('created_at').notNull(),
  settings: text('settings'), // JSON string
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull(), // 'live' | 'ended' | 'deleted'
  visibility: text('visibility').notNull(), // 'public' | 'followers' | 'private'
  viewerCount: integer('viewer_count').notNull().default(0),
  tags: text('tags'), // JSON array string
  upvotes: integer('upvotes').notNull().default(0),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
});

export const follows = sqliteTable('follows', {
  id: text('id').primaryKey(),
  followerId: text('follower_id')
    .notNull()
    .references(() => users.id),
  followingId: text('following_id')
    .notNull()
    .references(() => users.id),
  createdAt: text('created_at').notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull(),
  prefix: text('prefix').notNull(),
  createdAt: text('created_at').notNull(),
  lastUsedAt: text('last_used_at'),
  revokedAt: text('revoked_at'),
});

// ── Database Client ───────────────────────────────────────────

export function createDb(url: string, authToken: string) {
  const client = createClient({
    url,
    authToken,
  });

  return drizzle(client, {
    schema: { users, sessions, follows, apiKeys },
  });
}

export type Database = ReturnType<typeof createDb>;

// ── ID Generation ─────────────────────────────────────────────

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const ID_LENGTH = 12;

export function generateId(): string {
  const bytes = new Uint8Array(ID_LENGTH);
  crypto.getRandomValues(bytes);
  let id = '';
  for (let i = 0; i < ID_LENGTH; i++) {
    id += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return id;
}
