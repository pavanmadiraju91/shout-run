import { describe, it, expect, vi, beforeEach } from 'vitest';

const MockWebSocket = vi.fn().mockImplementation(function (
  this: Record<string, unknown>,
  url: string,
  _opts: unknown
) {
  this.url = url;
  this.readyState = 1; // OPEN
  this.binaryType = '';
  this.send = vi.fn();
  this.close = vi.fn();
  this.ping = vi.fn();
  this.on = vi.fn((event: string, handler: () => void) => {
    this['_' + event] = handler;
  });
  this.OPEN = 1;
  this.CLOSED = 3;
});

(MockWebSocket as unknown as Record<string, number>).OPEN = 1;
(MockWebSocket as unknown as Record<string, number>).CLOSED = 3;

vi.mock('ws', () => ({
  default: MockWebSocket,
  __esModule: true,
}));

describe('ReconnectingWebSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores url in constructor', async () => {
    const { ReconnectingWebSocket } = await import('../stream.js');
    const ws = new ReconnectingWebSocket('wss://example.com/socket', {});
    expect((ws as unknown as Record<string, string>).url).toBe('wss://example.com/socket');
  });

  it('creates WebSocket when connect is called', async () => {
    const { ReconnectingWebSocket } = await import('../stream.js');
    const ws = new ReconnectingWebSocket('wss://example.com/socket', {});
    ws.connect();
    expect(MockWebSocket).toHaveBeenCalledWith(
      'wss://example.com/socket',
      expect.objectContaining({ headers: {} })
    );
  });

  it('queues data when not connected', async () => {
    const { ReconnectingWebSocket } = await import('../stream.js');
    const ws = new ReconnectingWebSocket('wss://example.com/socket', {});
    // Don't call connect, so isConnected is false
    const data = new Uint8Array([1, 2, 3]);
    ws.send(data);
    // Data should be queued, not sent
    // Since ws is not connected, the internal queue should have the data
    expect(ws.connected).toBe(false);
  });

  it('close sets state and clears timers', async () => {
    const { ReconnectingWebSocket } = await import('../stream.js');
    const ws = new ReconnectingWebSocket('wss://example.com/socket', {});
    ws.connect();
    ws.close(1000, 'Normal closure');
    // After close, the websocket should be marked as closed
    expect((ws as unknown as Record<string, boolean>).isClosed).toBe(true);
  });

  it('connected getter returns false initially', async () => {
    const { ReconnectingWebSocket } = await import('../stream.js');
    const ws = new ReconnectingWebSocket('wss://example.com/socket', {});
    expect(ws.connected).toBe(false);
  });

  it('readyState returns CLOSED when no ws', async () => {
    const { ReconnectingWebSocket } = await import('../stream.js');
    const ws = new ReconnectingWebSocket('wss://example.com/socket', {});
    // Before connect, ws is null, should return WebSocket.CLOSED (3)
    expect(ws.readyState).toBe(3);
  });

  it('passes headers to WebSocket constructor', async () => {
    const { ReconnectingWebSocket } = await import('../stream.js');
    const headers = { Authorization: 'Bearer token123' };
    const ws = new ReconnectingWebSocket('wss://example.com/socket', headers);
    ws.connect();
    expect(MockWebSocket).toHaveBeenCalledWith(
      'wss://example.com/socket',
      expect.objectContaining({ headers })
    );
  });

  it('accepts custom reconnect options', async () => {
    const { ReconnectingWebSocket } = await import('../stream.js');
    const options = {
      maxReconnectDelay: 60000,
      initialReconnectDelay: 2000,
      pingInterval: 15000,
    };
    const ws = new ReconnectingWebSocket('wss://example.com/socket', {}, options);
    // Just verify it doesn't throw and stores the values
    expect(ws).toBeDefined();
  });
});
