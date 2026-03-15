/**
 * Binary WebSocket protocol for shout.
 *
 * Frame format:
 *   [type: 1 byte][timestamp: 4 bytes (uint32, milliseconds since session start)][payload: variable]
 *
 * This is ~3x smaller than JSON for terminal output chunks.
 */

// ── Frame Types ──────────────────────────────────────────────
export enum FrameType {
  /** Terminal output data */
  Output = 0x01,
  /** Session metadata (title, user info) */
  Meta = 0x02,
  /** Viewer count update */
  ViewerCount = 0x03,
  /** Session ended */
  End = 0x04,
  /** Ping/keepalive */
  Ping = 0x05,
  /** Pong/keepalive response */
  Pong = 0x06,
  /** Error message */
  Error = 0x07,
  /** Resize event (cols, rows) */
  Resize = 0x08,
}

// ── Encoder ──────────────────────────────────────────────────
const HEADER_SIZE = 5; // 1 byte type + 4 bytes timestamp

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function encodeFrame(
  type: FrameType,
  payload: Uint8Array | string,
  timestampSec: number = 0,
): Uint8Array {
  const payloadBytes =
    typeof payload === 'string' ? textEncoder.encode(payload) : payload;

  const frame = new Uint8Array(HEADER_SIZE + payloadBytes.length);
  const view = new DataView(frame.buffer);

  frame[0] = type;
  view.setUint32(1, timestampSec, false); // big-endian
  frame.set(payloadBytes, HEADER_SIZE);

  return frame;
}

// ── Decoder ──────────────────────────────────────────────────
export interface DecodedFrame {
  type: FrameType;
  timestamp: number;
  payload: Uint8Array;
}

export function decodeFrame(data: Uint8Array | ArrayBuffer): DecodedFrame {
  const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;

  if (bytes.length < HEADER_SIZE) {
    throw new Error(`Frame too short: ${bytes.length} bytes`);
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  return {
    type: bytes[0] as FrameType,
    timestamp: view.getUint32(1, false),
    payload: bytes.slice(HEADER_SIZE),
  };
}

// ── Helpers ──────────────────────────────────────────────────
export function encodeOutputFrame(data: string, timestampSec: number): Uint8Array {
  return encodeFrame(FrameType.Output, data, timestampSec);
}

export function encodeMetaFrame(meta: Record<string, unknown>): Uint8Array {
  return encodeFrame(FrameType.Meta, JSON.stringify(meta), 0);
}

export function encodeViewerCountFrame(count: number): Uint8Array {
  const payload = new Uint8Array(4);
  new DataView(payload.buffer).setUint32(0, count, false);
  return encodeFrame(FrameType.ViewerCount, payload, 0);
}

export function encodeResizeFrame(cols: number, rows: number): Uint8Array {
  const payload = new Uint8Array(4);
  const view = new DataView(payload.buffer);
  view.setUint16(0, cols, false);
  view.setUint16(2, rows, false);
  return encodeFrame(FrameType.Resize, payload, 0);
}

export function decodeViewerCount(payload: Uint8Array): number {
  return new DataView(payload.buffer, payload.byteOffset, payload.byteLength).getUint32(0, false);
}

export function decodeResize(payload: Uint8Array): { cols: number; rows: number } {
  const view = new DataView(payload.buffer, payload.byteOffset, payload.byteLength);
  return { cols: view.getUint16(0, false), rows: view.getUint16(2, false) };
}

export function payloadToString(payload: Uint8Array): string {
  return textDecoder.decode(payload);
}

export function encodeEndFrame(): Uint8Array {
  return encodeFrame(FrameType.End, new Uint8Array(0), 0);
}

export function encodePing(): Uint8Array {
  return encodeFrame(FrameType.Ping, new Uint8Array(0), 0);
}

export function encodePong(): Uint8Array {
  return encodeFrame(FrameType.Pong, new Uint8Array(0), 0);
}

export function encodeErrorFrame(message: string): Uint8Array {
  return encodeFrame(FrameType.Error, message, 0);
}
