import WebSocket from 'ws';
import { EventEmitter } from 'node:events';

export interface ReconnectingWebSocketOptions {
  maxReconnectDelay?: number;
  initialReconnectDelay?: number;
  pingInterval?: number;
}

export interface ReconnectingWebSocketEvents {
  open: [];
  close: [code: number, reason: string];
  message: [data: ArrayBuffer | string];
  error: [error: Error];
  reconnecting: [attempt: number];
}

export class ReconnectingWebSocket extends EventEmitter<ReconnectingWebSocketEvents> {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private reconnectDelay: number;
  private maxReconnectDelay: number;
  private initialReconnectDelay: number;
  private pingInterval: number;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private sendQueue: Array<ArrayBuffer | Uint8Array | string> = [];
  private isConnected = false;
  private isClosed = false;

  constructor(url: string, options: ReconnectingWebSocketOptions = {}) {
    super();
    this.url = url;
    this.maxReconnectDelay = options.maxReconnectDelay ?? 30000;
    this.initialReconnectDelay = options.initialReconnectDelay ?? 1000;
    this.reconnectDelay = this.initialReconnectDelay;
    this.pingInterval = options.pingInterval ?? 30000;
  }

  connect(): void {
    if (this.isClosed) return;

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.on('open', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = this.initialReconnectDelay;
      this.startPing();
      this.flushQueue();
      this.emit('open');
    });

    this.ws.on('close', (code, reason) => {
      this.isConnected = false;
      this.stopPing();
      this.emit('close', code, reason.toString());

      if (!this.isClosed) {
        this.scheduleReconnect();
      }
    });

    this.ws.on('message', (data: WebSocket.RawData) => {
      let buffer: Buffer;
      if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (Array.isArray(data)) {
        buffer = Buffer.concat(data);
      } else if (data instanceof ArrayBuffer) {
        this.emit('message', data);
        return;
      } else {
        buffer = Buffer.from(data);
      }

      const ab = new ArrayBuffer(buffer.length);
      const view = new Uint8Array(ab);
      for (let i = 0; i < buffer.length; i++) {
        view[i] = buffer[i];
      }
      this.emit('message', ab);
    });

    this.ws.on('error', (error) => {
      this.emit('error', error);
    });

    this.ws.on('pong', () => {
      // Connection is alive
    });
  }

  send(data: ArrayBuffer | Uint8Array | string): void {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      this.sendQueue.push(data);
    }
  }

  close(code?: number, reason?: string): void {
    this.isClosed = true;
    this.stopPing();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(code, reason);
      this.ws = null;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  private flushQueue(): void {
    while (this.sendQueue.length > 0 && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      const data = this.sendQueue.shift();
      if (data) {
        this.ws.send(data);
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.isClosed) return;

    this.reconnectAttempts++;
    this.emit('reconnecting', this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.pingInterval);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }
}
