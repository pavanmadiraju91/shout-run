import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────

// Mock drizzle/libsql so the db import doesn't fail
vi.mock('drizzle-orm/libsql', () => ({ drizzle: vi.fn() }));
vi.mock('@libsql/client', () => ({ createClient: vi.fn() }));
vi.mock('drizzle-orm/sqlite-core', () => {
  const chain = () => new Proxy({}, { get: () => chain });
  return { sqliteTable: () => ({}), text: chain, integer: chain };
});
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  sql: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
}));

// Mock db module
vi.mock('../../lib/db.js', () => ({
  createDb: vi.fn(() => ({
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => Promise.resolve()),
      })),
    })),
  })),
  sessions: {},
}));

// Mock vt-wasm
vi.mock('../../lib/vt-wasm/vt_wasm.js', () => ({
  default: vi.fn(),
  VtParser: vi.fn(),
}));
vi.mock('../../lib/vt-wasm/vt_wasm_bg.wasm', () => ({ default: {} }));

// Mock @shout/shared with real-ish implementations
const FrameType = {
  Output: 0x01,
  Meta: 0x02,
  ViewerCount: 0x03,
  End: 0x04,
  Ping: 0x05,
  Pong: 0x06,
  Error: 0x07,
  Resize: 0x08,
  Snapshot: 0x09,
};

function encodeTestFrame(type: number, payload: Uint8Array, timestamp: number): Uint8Array {
  const frame = new Uint8Array(5 + payload.length);
  const view = new DataView(frame.buffer);
  frame[0] = type;
  view.setUint32(1, timestamp, false);
  frame.set(payload, 5);
  return frame;
}

function encodeOutputFrame(text: string, timestamp: number): Uint8Array {
  return encodeTestFrame(FrameType.Output, new TextEncoder().encode(text), timestamp);
}

function encodeResizeFrame(cols: number, rows: number): Uint8Array {
  const payload = new Uint8Array(4);
  const view = new DataView(payload.buffer);
  view.setUint16(0, cols, false);
  view.setUint16(2, rows, false);
  return encodeTestFrame(FrameType.Resize, payload, 0);
}

vi.mock('@shout/shared', () => ({
  FrameType,
  decodeFrame: (data: Uint8Array) => {
    const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      type: bytes[0],
      timestamp: view.getUint32(1, false),
      payload: bytes.slice(5),
    };
  },
  decodeResize: (payload: Uint8Array) => {
    const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
    return { cols: view.getUint16(0, false), rows: view.getUint16(2, false) };
  },
  encodeEndFrame: () => new Uint8Array([FrameType.End, 0, 0, 0, 0]),
  encodeOutputFrame,
  encodeResizeFrame,
  encodeSnapshotFrame: (data: Uint8Array) => encodeTestFrame(FrameType.Snapshot, data, 0),
  encodeViewerCountFrame: (count: number) => {
    const payload = new Uint8Array(4);
    new DataView(payload.buffer).setUint32(0, count, false);
    return encodeTestFrame(FrameType.ViewerCount, payload, 0);
  },
  encodeMetaFrame: (meta: Record<string, unknown>) =>
    encodeTestFrame(FrameType.Meta, new TextEncoder().encode(JSON.stringify(meta)), 0),
  encodePing: () => new Uint8Array([FrameType.Ping, 0, 0, 0, 0]),
  WS_CLOSE: { SESSION_ENDED: 4000, MAX_DURATION: 4001 },
  DEFAULT_RATE_LIMITS: { maxBytesPerSecond: 102400, maxSessionDurationMs: 14400000 },
  PING_INTERVAL_MS: 30000,
}));

// ── Mock Factories ───────────────────────────────────────────

function createMockStorage() {
  const data = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => data.get(key)),
    put: vi.fn(async (key: string, value: unknown) => {
      data.set(key, value);
    }),
    setAlarm: vi.fn(),
    deleteAlarm: vi.fn(),
    _data: data,
  };
}

function createMockR2Bucket() {
  const objects = new Map<string, string>();
  return {
    put: vi.fn(async (key: string, value: string) => {
      objects.set(key, value);
    }),
    get: vi.fn(async (key: string) => {
      const val = objects.get(key);
      if (!val) return null;
      return {
        json: async () => JSON.parse(val),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(val));
            controller.close();
          },
        }),
      };
    }),
    _objects: objects,
  };
}

function createMockState(storage: ReturnType<typeof createMockStorage>) {
  return {
    storage,
    getWebSockets: vi.fn(() => []),
    acceptWebSocket: vi.fn(),
    blockConcurrencyWhile: vi.fn(async (cb: () => Promise<void>) => {
      await cb();
    }),
  };
}

function createMockEnv(r2?: ReturnType<typeof createMockR2Bucket>) {
  return {
    SESSION_HUB: {} as any,
    SESSIONS_BUCKET: r2 ?? undefined,
    RATE_LIMITS: {} as any,
    GITHUB_CLIENT_ID: 'test',
    GITHUB_CLIENT_SECRET: 'test',
    TURSO_URL: 'test',
    TURSO_AUTH_TOKEN: 'test',
    JWT_SECRET: 'test',
  };
}

const SESSION_STATE = {
  sessionId: 'test-session-123',
  userId: 'user-1',
  username: 'testuser',
  title: 'Test Session',
  visibility: 'public' as const,
  startedAt: 1000000,
};

async function createInitializedHub(
  options: {
    r2?: ReturnType<typeof createMockR2Bucket>;
    visibility?: 'public' | 'private';
    flushState?: { flushedPartCount: number; totalFlushedChunks: number };
  } = {},
) {
  const storage = createMockStorage();
  const r2 = options.r2 ?? createMockR2Bucket();
  const env = createMockEnv(r2);
  const state = createMockState(storage);

  // Pre-set flush state if provided (simulates hibernation recovery)
  if (options.flushState) {
    storage._data.set('r2FlushState', options.flushState);
  }

  const { SessionHub } = await import('../SessionHub.js');
  const hub = new SessionHub(state as any, env as any);

  // Initialize session state
  const sessionState = {
    ...SESSION_STATE,
    ...(options.visibility ? { visibility: options.visibility } : {}),
  };
  storage._data.set('sessionState', sessionState);

  // Simulate /init
  const initReq = new Request('http://localhost/init', {
    method: 'POST',
    body: JSON.stringify(sessionState),
  });
  await hub.fetch(initReq);

  return { hub, storage, r2, env, state };
}

// Helper to inject binary frames into the hub via flushPendingToR2
async function injectFrames(
  hub: InstanceType<Awaited<typeof import('../SessionHub.js')>['SessionHub']>,
  frames: Uint8Array[],
) {
  // We need to simulate what webSocketMessage does — push to pendingChunks
  // Since pendingChunks is private, we simulate via the broadcaster WebSocket path
  // Instead, access through the flush method after manually setting up state
  // We'll use the public webSocketMessage with a mock broadcaster
}

// ── Tests ────────────────────────────────────────────────────

describe('SessionHub — R2 streaming replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── R2 batch flushing ────────────────────────────────────

  describe('flushPendingToR2', () => {
    it('writes part file with correct key (sessions/{id}/part-000000.json)', async () => {
      const { hub, r2 } = await createInitializedHub();

      // Manually set pendingChunks via accessing the instance
      const outputFrame = encodeOutputFrame('hello world', 1000);
      (hub as any).pendingChunks = [outputFrame];
      (hub as any).pendingChunksBytes = outputFrame.byteLength;

      await hub.flushPendingToR2();

      expect(r2.put).toHaveBeenCalledWith(
        `sessions/${SESSION_STATE.sessionId}/part-000000.json`,
        expect.any(String),
        expect.objectContaining({ httpMetadata: { contentType: 'application/json' } }),
      );

      // Verify the JSON content
      const putCall = r2.put.mock.calls[0];
      const written = JSON.parse(putCall[1] as string);
      expect(written.chunks).toHaveLength(1);
      expect(written.chunks[0].type).toBe('output');
      expect(written.chunks[0].data).toBe('hello world');
      expect(written.chunks[0].timestamp).toBe(1000);
    });

    it('increments flushedPartCount and clears pendingChunks', async () => {
      const { hub } = await createInitializedHub();

      (hub as any).pendingChunks = [encodeOutputFrame('test', 100)];
      (hub as any).pendingChunksBytes = 100;

      await hub.flushPendingToR2();

      expect((hub as any).flushedPartCount).toBe(1);
      expect((hub as any).totalFlushedChunks).toBe(1);
      expect((hub as any).pendingChunks).toHaveLength(0);
      expect((hub as any).pendingChunksBytes).toBe(0);
    });

    it('saves flush state to DO storage for crash recovery', async () => {
      const { hub, storage } = await createInitializedHub();

      (hub as any).pendingChunks = [encodeOutputFrame('test', 100)];
      (hub as any).pendingChunksBytes = 100;

      await hub.flushPendingToR2();

      expect(storage.put).toHaveBeenCalledWith('r2FlushState', {
        flushedPartCount: 1,
        totalFlushedChunks: 1,
      });
    });

    it('is a no-op for private sessions', async () => {
      const { hub, r2 } = await createInitializedHub({ visibility: 'private' });

      (hub as any).pendingChunks = [encodeOutputFrame('secret', 100)];
      (hub as any).pendingChunksBytes = 100;

      await hub.flushPendingToR2();

      expect(r2.put).not.toHaveBeenCalled();
    });

    it('is a no-op when pendingChunks is empty', async () => {
      const { hub, r2 } = await createInitializedHub();

      await hub.flushPendingToR2();

      expect(r2.put).not.toHaveBeenCalled();
    });

    it('is a no-op when R2 bucket not bound', async () => {
      const storage = createMockStorage();
      const env = createMockEnv();
      env.SESSIONS_BUCKET = undefined as any;
      const state = createMockState(storage);

      const { SessionHub } = await import('../SessionHub.js');
      const hub = new SessionHub(state as any, env as any);

      const initReq = new Request('http://localhost/init', {
        method: 'POST',
        body: JSON.stringify(SESSION_STATE),
      });
      await hub.fetch(initReq);

      (hub as any).pendingChunks = [encodeOutputFrame('test', 100)];
      (hub as any).pendingChunksBytes = 100;

      await hub.flushPendingToR2();

      // Should not throw, just no-op
      expect((hub as any).pendingChunks).toHaveLength(1); // unchanged
    });

    it('keeps chunks in memory on R2 write failure', async () => {
      const { hub, r2 } = await createInitializedHub();
      r2.put.mockRejectedValueOnce(new Error('R2 unavailable'));

      const frame = encodeOutputFrame('keep me', 100);
      (hub as any).pendingChunks = [frame];
      (hub as any).pendingChunksBytes = frame.byteLength;

      await hub.flushPendingToR2();

      // Chunks should still be in memory
      expect((hub as any).pendingChunks).toHaveLength(1);
      expect((hub as any).flushedPartCount).toBe(0);
    });
  });

  // ── Frame recording ──────────────────────────────────────

  describe('frame recording', () => {
    it('frames are appended to pendingChunks', async () => {
      const { hub } = await createInitializedHub();

      // Simulate broadcaster connection
      const mockWs = { send: vi.fn(), close: vi.fn() };
      (hub as any).broadcaster = mockWs;

      const frame = encodeOutputFrame('data', 500);
      await hub.webSocketMessage(mockWs as any, frame.buffer as ArrayBuffer);

      expect((hub as any).pendingChunks).toHaveLength(1);
    });

    it('private session frames are not recorded', async () => {
      const { hub } = await createInitializedHub({ visibility: 'private' });

      const mockWs = { send: vi.fn(), close: vi.fn() };
      (hub as any).broadcaster = mockWs;

      const frame = encodeOutputFrame('secret', 500);
      await hub.webSocketMessage(mockWs as any, frame.buffer as ArrayBuffer);

      expect((hub as any).pendingChunks).toHaveLength(0);
    });
  });

  // ── Session end (manifest + consolidation) ───────────────

  describe('writeManifest', () => {
    it('writes manifest.json with correct partCount', async () => {
      const { hub, r2 } = await createInitializedHub();

      // Simulate having flushed 3 parts
      (hub as any).flushedPartCount = 3;
      (hub as any).totalFlushedChunks = 150;

      await (hub as any).writeManifest();

      const manifestCall = r2.put.mock.calls.find((c: any[]) =>
        (c[0] as string).endsWith('/manifest.json'),
      );
      expect(manifestCall).toBeDefined();
      const manifest = JSON.parse(manifestCall![1] as string);
      expect(manifest.partCount).toBe(3);
      expect(manifest.totalChunks).toBe(150);
    });

    it('writes meta.json with session metadata', async () => {
      const { hub, r2 } = await createInitializedHub();

      (hub as any).flushedPartCount = 1;
      (hub as any).totalFlushedChunks = 10;

      await (hub as any).writeManifest();

      const metaCall = r2.put.mock.calls.find((c: any[]) =>
        (c[0] as string).endsWith('/meta.json'),
      );
      expect(metaCall).toBeDefined();
      const meta = JSON.parse(metaCall![1] as string);
      expect(meta.sessionId).toBe(SESSION_STATE.sessionId);
      expect(meta.username).toBe(SESSION_STATE.username);
      expect(meta.partCount).toBe(1);
    });
  });

  describe('consolidateReplay', () => {
    it('reads all parts and writes single replay.json', async () => {
      const r2 = createMockR2Bucket();
      const { hub } = await createInitializedHub({ r2 });

      // Set up 2 flushed parts in R2
      const prefix = `sessions/${SESSION_STATE.sessionId}`;
      r2._objects.set(
        `${prefix}/part-000000.json`,
        JSON.stringify({ chunks: [{ type: 'output', data: 'hello', timestamp: 100 }] }),
      );
      r2._objects.set(
        `${prefix}/part-000001.json`,
        JSON.stringify({ chunks: [{ type: 'output', data: 'world', timestamp: 200 }] }),
      );

      (hub as any).flushedPartCount = 2;
      (hub as any).totalFlushedChunks = 2;

      await (hub as any).consolidateReplay();

      const replayCall = r2.put.mock.calls.find((c: any[]) =>
        (c[0] as string).endsWith('/replay.json'),
      );
      expect(replayCall).toBeDefined();
      const replay = JSON.parse(replayCall![1] as string);
      expect(replay.chunks).toHaveLength(2);
      expect(replay.chunks[0].data).toBe('hello');
      expect(replay.chunks[1].data).toBe('world');
    });

    it('skips consolidation when part count exceeds MAX_CONSOLIDATION_PARTS', async () => {
      const { hub, r2 } = await createInitializedHub();

      (hub as any).flushedPartCount = 34; // > 33
      (hub as any).totalFlushedChunks = 1000;

      await (hub as any).consolidateReplay();

      // Should not have written replay.json
      const replayCall = r2.put.mock.calls.find((c: any[]) =>
        (c[0] as string).endsWith('/replay.json'),
      );
      expect(replayCall).toBeUndefined();
    });
  });

  // ── Replay retrieval ─────────────────────────────────────

  describe('handleReplay', () => {
    it('returns R2 parts + pending memory for live sessions', async () => {
      const r2 = createMockR2Bucket();
      const { hub } = await createInitializedHub({ r2 });

      // Set up 1 flushed part in R2
      const prefix = `sessions/${SESSION_STATE.sessionId}`;
      r2._objects.set(
        `${prefix}/part-000000.json`,
        JSON.stringify({ chunks: [{ type: 'output', data: 'flushed', timestamp: 100 }] }),
      );

      (hub as any).flushedPartCount = 1;
      (hub as any).totalFlushedChunks = 1;
      (hub as any).broadcaster = { send: vi.fn() }; // live session
      (hub as any).pendingChunks = [encodeOutputFrame('pending', 200)];
      (hub as any).pendingChunksBytes = 100;

      const response = await hub.fetch(new Request('http://localhost/replay'));
      const data = await response.json();

      expect(data.chunks).toHaveLength(2);
      expect(data.chunks[0].data).toBe('flushed');
      expect(data.chunks[1].data).toBe('pending');
    });

    it('returns consolidated replay.json for ended sessions', async () => {
      const r2 = createMockR2Bucket();
      const { hub } = await createInitializedHub({ r2 });

      const prefix = `sessions/${SESSION_STATE.sessionId}`;
      r2._objects.set(
        `${prefix}/replay.json`,
        JSON.stringify({
          chunks: [
            { type: 'output', data: 'consolidated', timestamp: 100 },
            { type: 'output', data: 'data', timestamp: 200 },
          ],
        }),
      );

      const response = await hub.fetch(new Request('http://localhost/replay'));
      const data = await response.json();

      expect(data.chunks).toHaveLength(2);
      expect(data.chunks[0].data).toBe('consolidated');
    });

    it('falls back to legacy sessions/{id}.json for old sessions', async () => {
      const r2 = createMockR2Bucket();
      const { hub } = await createInitializedHub({ r2 });

      // Only legacy format exists
      r2._objects.set(
        `sessions/${SESSION_STATE.sessionId}.json`,
        JSON.stringify({
          chunks: [{ type: 'output', data: 'legacy', timestamp: 100 }],
        }),
      );

      const response = await hub.fetch(new Request('http://localhost/replay'));
      const data = await response.json();

      expect(data.chunks).toHaveLength(1);
      expect(data.chunks[0].data).toBe('legacy');
    });

    it('falls back to DO storage replayChunks for legacy data', async () => {
      const { hub, storage } = await createInitializedHub();

      // No R2 data — only DO storage
      storage._data.set('replayChunks', [
        { type: 'output', data: 'do-stored', timestamp: 100 },
      ]);

      // Clear R2 (no objects)
      const response = await hub.fetch(new Request('http://localhost/replay'));
      const data = await response.json();

      expect(data.chunks).toHaveLength(1);
      expect(data.chunks[0].data).toBe('do-stored');
    });

    it('returns empty for private sessions', async () => {
      const { hub } = await createInitializedHub({ visibility: 'private' });

      const response = await hub.fetch(new Request('http://localhost/replay'));
      const data = await response.json();

      expect(data.chunks).toHaveLength(0);
    });
  });

  // ── State recovery ───────────────────────────────────────

  describe('state recovery', () => {
    it('restores flushedPartCount from DO storage after hibernation', async () => {
      const { hub } = await createInitializedHub({
        flushState: { flushedPartCount: 5, totalFlushedChunks: 250 },
      });

      expect((hub as any).flushedPartCount).toBe(5);
      expect((hub as any).totalFlushedChunks).toBe(250);
    });

    it('after recovery, next flush writes part-{N+1}.json', async () => {
      const { hub, r2 } = await createInitializedHub({
        flushState: { flushedPartCount: 3, totalFlushedChunks: 100 },
      });

      (hub as any).pendingChunks = [encodeOutputFrame('continued', 500)];
      (hub as any).pendingChunksBytes = 100;

      await hub.flushPendingToR2();

      expect(r2.put).toHaveBeenCalledWith(
        `sessions/${SESSION_STATE.sessionId}/part-000003.json`,
        expect.any(String),
        expect.any(Object),
      );
      expect((hub as any).flushedPartCount).toBe(4);
    });
  });

  // ── Export ───────────────────────────────────────────────

  describe('handleExport', () => {
    it('generates valid asciicast v2 from R2-stored chunks', async () => {
      const r2 = createMockR2Bucket();
      const { hub } = await createInitializedHub({ r2 });

      const prefix = `sessions/${SESSION_STATE.sessionId}`;
      r2._objects.set(
        `${prefix}/replay.json`,
        JSON.stringify({
          chunks: [
            { type: 'resize', data: '', timestamp: 100, cols: 120, rows: 40 },
            { type: 'output', data: 'hello', timestamp: 100 },
            { type: 'output', data: ' world', timestamp: 200 },
          ],
        }),
      );

      const response = await hub.fetch(new Request('http://localhost/export'));
      expect(response.status).toBe(200);

      const body = await response.text();
      const lines = body.trim().split('\n');

      // First line = header
      const header = JSON.parse(lines[0]);
      expect(header.version).toBe(2);
      expect(header.width).toBe(120);
      expect(header.height).toBe(40);

      // Remaining lines = events
      const event1 = JSON.parse(lines[1]);
      expect(event1[0]).toBe(0); // elapsed = 0s
      expect(event1[1]).toBe('o');
      expect(event1[2]).toBe('hello');

      const event2 = JSON.parse(lines[2]);
      expect(event2[0]).toBe(0.1); // 100ms elapsed
      expect(event2[2]).toBe(' world');
    });

    it('works with legacy format (backward compat)', async () => {
      const r2 = createMockR2Bucket();
      const { hub } = await createInitializedHub({ r2 });

      r2._objects.set(
        `sessions/${SESSION_STATE.sessionId}.json`,
        JSON.stringify({
          chunks: [
            { type: 'output', data: 'legacy export', timestamp: 0 },
          ],
        }),
      );

      const response = await hub.fetch(new Request('http://localhost/export'));
      expect(response.status).toBe(200);

      const body = await response.text();
      const lines = body.trim().split('\n');
      expect(lines.length).toBe(2); // header + 1 event

      const event = JSON.parse(lines[1]);
      expect(event[2]).toBe('legacy export');
    });
  });
});
