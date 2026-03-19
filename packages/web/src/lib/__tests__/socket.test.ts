import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@shout/shared', () => ({
  decodeFrame: vi.fn(),
  decodeViewerCount: vi.fn(),
  decodeResize: vi.fn(),
  payloadToString: vi.fn(),
  FrameType: {
    Output: 0x01,
    Meta: 0x02,
    ViewerCount: 0x03,
    End: 0x04,
    Ping: 0x05,
    Pong: 0x06,
    Error: 0x07,
    Resize: 0x08,
    Snapshot: 0x09,
  },
  encodePong: vi.fn(() => new Uint8Array(5)),
}));

import { createSocket, type SocketCallbacks } from '../socket';

describe('socket', () => {
  const mockCallbacks: SocketCallbacks = {
    onOutput: vi.fn(),
    onViewerCount: vi.fn(),
    onResize: vi.fn(),
    onEnd: vi.fn(),
    onError: vi.fn(),
  };

  let wsInstances: Array<Record<string, unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    wsInstances = [];

    // Must use a function (not arrow) so `new WebSocket()` works
    const MockWebSocket = vi.fn(function (this: Record<string, unknown>) {
      this.addEventListener = vi.fn();
      this.removeEventListener = vi.fn();
      this.close = vi.fn();
      this.send = vi.fn();
      this.readyState = 1;
      this.binaryType = 'blob';
      wsInstances.push(this);
    });
    (MockWebSocket as unknown as Record<string, unknown>).OPEN = 1;
    (MockWebSocket as unknown as Record<string, unknown>).CLOSED = 3;

    vi.stubGlobal('WebSocket', MockWebSocket);

    process.env.NEXT_PUBLIC_API_URL = 'https://api.shout.run';
  });

  it('createSocket returns connect/disconnect functions', () => {
    const socket = createSocket('test-session', mockCallbacks);

    expect(socket).toHaveProperty('connect');
    expect(socket).toHaveProperty('disconnect');
    expect(typeof socket.connect).toBe('function');
    expect(typeof socket.disconnect).toBe('function');
  });

  it('connect creates a WebSocket', () => {
    const socket = createSocket('test-session', mockCallbacks);
    socket.connect();

    expect(WebSocket).toHaveBeenCalled();
    expect(wsInstances.length).toBe(1);
  });

  it('disconnect closes and cleans up', () => {
    const socket = createSocket('test-session', mockCallbacks);
    socket.connect();
    socket.disconnect();

    expect(wsInstances[0].close).toHaveBeenCalled();
  });

  it('disconnect prevents reconnection', () => {
    const socket = createSocket('test-session', mockCallbacks);
    socket.connect();
    socket.disconnect();

    expect(wsInstances[0].close).toHaveBeenCalled();
  });

  it('WebSocket URL uses wss for https API URL', () => {
    const socket = createSocket('my-session', mockCallbacks);
    socket.connect();

    expect(WebSocket).toHaveBeenCalledWith(
      'wss://api.shout.run/api/sessions/my-session/ws/viewer',
    );
  });

  it('connect sets binaryType to arraybuffer', () => {
    const socket = createSocket('test-session', mockCallbacks);
    socket.connect();

    expect(wsInstances[0].binaryType).toBe('arraybuffer');
  });
});
