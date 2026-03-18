import {
  decodeFrame,
  decodeViewerCount,
  decodeResize,
  payloadToString,
  FrameType,
  encodePong,
} from '@shout/shared';

export interface SocketCallbacks {
  onOutput: (data: string) => void;
  onViewerCount: (count: number) => void;
  onResize: (cols: number, rows: number) => void;
  onEnd: () => void;
  onError: (error: string) => void;
}

interface Socket {
  connect: () => void;
  disconnect: () => void;
}

const RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30000;

export function createSocket(sessionId: string, callbacks: SocketCallbacks): Socket {
  let ws: WebSocket | null = null;
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let reconnectDelay = RECONNECT_DELAY_MS;
  let shouldReconnect = true;

  function getWebSocketUrl(): string {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const host = apiUrl.replace(/^https?:\/\//, '') || window.location.host;
    return `${wsProtocol}://${host}/api/sessions/${sessionId}/ws/viewer`;
  }

  function handleMessage(event: MessageEvent) {
    if (event.data instanceof Blob) {
      event.data.arrayBuffer().then((buffer) => {
        processFrame(new Uint8Array(buffer));
      });
    } else if (event.data instanceof ArrayBuffer) {
      processFrame(new Uint8Array(event.data));
    }
  }

  function processFrame(data: Uint8Array) {
    try {
      const frame = decodeFrame(data);

      switch (frame.type) {
        case FrameType.Output:
          callbacks.onOutput(payloadToString(frame.payload));
          break;

        case FrameType.ViewerCount:
          callbacks.onViewerCount(decodeViewerCount(frame.payload));
          break;

        case FrameType.Resize: {
          const { cols, rows } = decodeResize(frame.payload);
          callbacks.onResize(cols, rows);
          break;
        }

        case FrameType.End:
          callbacks.onEnd();
          shouldReconnect = false;
          break;

        case FrameType.Ping:
          // Respond with pong
          ws?.send(encodePong());
          break;

        case FrameType.Error:
          callbacks.onError(payloadToString(frame.payload));
          break;

        case FrameType.Meta:
          // Session metadata - could be used for title updates
          break;

        case FrameType.Snapshot:
          // Snapshot contains ANSI escape sequences that reconstruct the terminal screen
          callbacks.onOutput(payloadToString(frame.payload));
          break;

        default:
          // Unknown frame type, ignore
          break;
      }
    } catch (error) {
      console.error('Failed to decode frame:', error);
    }
  }

  function handleOpen() {
    console.log('[shout] Connected to session');
    reconnectDelay = RECONNECT_DELAY_MS;
  }

  function handleClose(event: CloseEvent) {
    console.log('[shout] Connection closed:', event.code, event.reason);

    if (shouldReconnect && event.code !== 4000) {
      // 4000 = session ended normally
      scheduleReconnect();
    }
  }

  function handleError() {
    console.error('[shout] WebSocket error');
  }

  function scheduleReconnect() {
    if (reconnectTimeout) return;

    console.log(`[shout] Reconnecting in ${reconnectDelay}ms...`);
    reconnectTimeout = setTimeout(() => {
      reconnectTimeout = null;
      connect();
    }, reconnectDelay);

    // Exponential backoff
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return;

    try {
      ws = new WebSocket(getWebSocketUrl());
      ws.binaryType = 'arraybuffer';

      ws.addEventListener('open', handleOpen);
      ws.addEventListener('message', handleMessage);
      ws.addEventListener('close', handleClose);
      ws.addEventListener('error', handleError);
    } catch (error) {
      console.error('[shout] Failed to connect:', error);
      scheduleReconnect();
    }
  }

  function disconnect() {
    shouldReconnect = false;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (ws) {
      ws.removeEventListener('open', handleOpen);
      ws.removeEventListener('message', handleMessage);
      ws.removeEventListener('close', handleClose);
      ws.removeEventListener('error', handleError);
      ws.close();
      ws = null;
    }
  }

  return { connect, disconnect };
}
