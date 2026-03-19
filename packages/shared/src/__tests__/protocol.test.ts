import { describe, it, expect } from 'vitest';
import {
  FrameType,
  encodeFrame,
  decodeFrame,
  encodeOutputFrame,
  encodeMetaFrame,
  encodeViewerCountFrame,
  decodeViewerCount,
  encodeResizeFrame,
  decodeResize,
  encodeEndFrame,
  encodePing,
  encodePong,
  encodeErrorFrame,
  encodeSnapshotFrame,
  payloadToString,
} from '../protocol.js';

describe('FrameType enum', () => {
  it('Output is 0x01', () => {
    expect(FrameType.Output).toBe(0x01);
  });

  it('Meta is 0x02', () => {
    expect(FrameType.Meta).toBe(0x02);
  });

  it('ViewerCount is 0x03', () => {
    expect(FrameType.ViewerCount).toBe(0x03);
  });

  it('End is 0x04', () => {
    expect(FrameType.End).toBe(0x04);
  });

  it('Ping is 0x05', () => {
    expect(FrameType.Ping).toBe(0x05);
  });

  it('Pong is 0x06', () => {
    expect(FrameType.Pong).toBe(0x06);
  });

  it('Error is 0x07', () => {
    expect(FrameType.Error).toBe(0x07);
  });

  it('Resize is 0x08', () => {
    expect(FrameType.Resize).toBe(0x08);
  });

  it('Snapshot is 0x09', () => {
    expect(FrameType.Snapshot).toBe(0x09);
  });
});

describe('encodeFrame/decodeFrame', () => {
  it('round-trips string payload', () => {
    const frame = encodeFrame(FrameType.Output, 'hello', 123);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Output);
    expect(decoded.timestamp).toBe(123);
    expect(payloadToString(decoded.payload)).toBe('hello');
  });

  it('round-trips Uint8Array payload', () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5]);
    const frame = encodeFrame(FrameType.Meta, payload, 456);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Meta);
    expect(decoded.timestamp).toBe(456);
    expect(decoded.payload).toEqual(payload);
  });

  it('round-trips empty payload', () => {
    const frame = encodeFrame(FrameType.End, new Uint8Array(0), 0);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.End);
    expect(decoded.timestamp).toBe(0);
    expect(decoded.payload.length).toBe(0);
  });

  it('handles max uint32 timestamp (4294967295)', () => {
    const maxUint32 = 0xffffffff;
    const frame = encodeFrame(FrameType.Output, 'test', maxUint32);
    const decoded = decodeFrame(frame);
    expect(decoded.timestamp).toBe(maxUint32);
  });

  it('round-trips all 9 frame types', () => {
    const types = [
      FrameType.Output,
      FrameType.Meta,
      FrameType.ViewerCount,
      FrameType.End,
      FrameType.Ping,
      FrameType.Pong,
      FrameType.Error,
      FrameType.Resize,
      FrameType.Snapshot,
    ];
    for (const type of types) {
      const frame = encodeFrame(type, 'data', 100);
      const decoded = decodeFrame(frame);
      expect(decoded.type).toBe(type);
    }
  });

  it('handles unicode payload', () => {
    const frame = encodeFrame(FrameType.Output, '你好世界🎉', 0);
    const decoded = decodeFrame(frame);
    expect(payloadToString(decoded.payload)).toBe('你好世界🎉');
  });

  it('handles ANSI escape sequences', () => {
    const ansi = '\x1b[31mRed\x1b[0m \x1b[32mGreen\x1b[0m';
    const frame = encodeFrame(FrameType.Output, ansi, 0);
    const decoded = decodeFrame(frame);
    expect(payloadToString(decoded.payload)).toBe(ansi);
  });

  it('frame header is exactly 5 bytes', () => {
    const frame = encodeFrame(FrameType.Output, '', 0);
    expect(frame.length).toBe(5);
  });

  it('uses big-endian for timestamp', () => {
    const frame = encodeFrame(FrameType.Output, '', 0x01020304);
    // Bytes 1-4 should be [0x01, 0x02, 0x03, 0x04] for big-endian
    expect(frame[1]).toBe(0x01);
    expect(frame[2]).toBe(0x02);
    expect(frame[3]).toBe(0x03);
    expect(frame[4]).toBe(0x04);
  });
});

describe('decodeFrame error handling', () => {
  it('throws for buffer < 5 bytes', () => {
    expect(() => decodeFrame(new Uint8Array([1, 2, 3, 4]))).toThrow('Frame too short');
    expect(() => decodeFrame(new Uint8Array([1]))).toThrow('Frame too short');
    expect(() => decodeFrame(new Uint8Array([]))).toThrow('Frame too short');
  });

  it('accepts exactly 5 bytes (empty payload)', () => {
    const frame = new Uint8Array([0x01, 0, 0, 0, 0]);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Output);
    expect(decoded.payload.length).toBe(0);
  });

  it('accepts ArrayBuffer input', () => {
    const frame = encodeFrame(FrameType.Output, 'test', 42);
    const decoded = decodeFrame(frame.buffer);
    expect(decoded.type).toBe(FrameType.Output);
    expect(decoded.timestamp).toBe(42);
    expect(payloadToString(decoded.payload)).toBe('test');
  });
});

describe('encodeOutputFrame', () => {
  it('round-trips empty string', () => {
    const frame = encodeOutputFrame('', 0);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Output);
    expect(payloadToString(decoded.payload)).toBe('');
  });

  it('round-trips ASCII text', () => {
    const frame = encodeOutputFrame('Hello, World!', 100);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Output);
    expect(decoded.timestamp).toBe(100);
    expect(payloadToString(decoded.payload)).toBe('Hello, World!');
  });

  it('round-trips multi-byte UTF-8', () => {
    const text = '日本語テスト émojis: 🚀🔥💻';
    const frame = encodeOutputFrame(text, 0);
    const decoded = decodeFrame(frame);
    expect(payloadToString(decoded.payload)).toBe(text);
  });

  it('handles large payload (100KB)', () => {
    const largeText = 'x'.repeat(100 * 1024);
    const frame = encodeOutputFrame(largeText, 999);
    const decoded = decodeFrame(frame);
    expect(payloadToString(decoded.payload)).toBe(largeText);
    expect(decoded.timestamp).toBe(999);
  });
});

describe('encodeMetaFrame', () => {
  it('encodes empty object', () => {
    const frame = encodeMetaFrame({});
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Meta);
    expect(JSON.parse(payloadToString(decoded.payload))).toEqual({});
  });

  it('encodes nested object', () => {
    const meta = {
      title: 'Test Session',
      cols: 80,
      rows: 24,
      env: { shell: '/bin/zsh', term: 'xterm-256color' },
    };
    const frame = encodeMetaFrame(meta);
    const decoded = decodeFrame(frame);
    expect(JSON.parse(payloadToString(decoded.payload))).toEqual(meta);
  });

  it('encodes special characters in values', () => {
    const meta = { text: 'quotes "here" and \'there\' and\nnewlines' };
    const frame = encodeMetaFrame(meta);
    const decoded = decodeFrame(frame);
    expect(JSON.parse(payloadToString(decoded.payload))).toEqual(meta);
  });
});

describe('encodeViewerCountFrame/decodeViewerCount', () => {
  it('encodes and decodes 0', () => {
    const frame = encodeViewerCountFrame(0);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.ViewerCount);
    expect(decodeViewerCount(decoded.payload)).toBe(0);
  });

  it('encodes and decodes 1', () => {
    const frame = encodeViewerCountFrame(1);
    const decoded = decodeFrame(frame);
    expect(decodeViewerCount(decoded.payload)).toBe(1);
  });

  it('encodes and decodes max uint32 (4294967295)', () => {
    const frame = encodeViewerCountFrame(0xffffffff);
    const decoded = decodeFrame(frame);
    expect(decodeViewerCount(decoded.payload)).toBe(0xffffffff);
  });

  it('payload is exactly 4 bytes', () => {
    const frame = encodeViewerCountFrame(12345);
    const decoded = decodeFrame(frame);
    expect(decoded.payload.length).toBe(4);
  });
});

describe('encodeResizeFrame/decodeResize', () => {
  it('encodes and decodes standard 80x24', () => {
    const frame = encodeResizeFrame(80, 24);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Resize);
    const { cols, rows } = decodeResize(decoded.payload);
    expect(cols).toBe(80);
    expect(rows).toBe(24);
  });

  it('encodes and decodes minimum 1x1', () => {
    const frame = encodeResizeFrame(1, 1);
    const decoded = decodeFrame(frame);
    const { cols, rows } = decodeResize(decoded.payload);
    expect(cols).toBe(1);
    expect(rows).toBe(1);
  });

  it('encodes and decodes max uint16 (65535x65535)', () => {
    const frame = encodeResizeFrame(65535, 65535);
    const decoded = decodeFrame(frame);
    const { cols, rows } = decodeResize(decoded.payload);
    expect(cols).toBe(65535);
    expect(rows).toBe(65535);
  });

  it('payload is exactly 4 bytes', () => {
    const frame = encodeResizeFrame(120, 40);
    const decoded = decodeFrame(frame);
    expect(decoded.payload.length).toBe(4);
  });
});

describe('encodeEndFrame', () => {
  it('produces exactly 5 bytes', () => {
    const frame = encodeEndFrame();
    expect(frame.length).toBe(5);
  });

  it('has correct type', () => {
    const frame = encodeEndFrame();
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.End);
  });

  it('has empty payload', () => {
    const frame = encodeEndFrame();
    const decoded = decodeFrame(frame);
    expect(decoded.payload.length).toBe(0);
  });
});

describe('encodePing', () => {
  it('produces exactly 5 bytes', () => {
    const frame = encodePing();
    expect(frame.length).toBe(5);
  });

  it('has correct type', () => {
    const frame = encodePing();
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Ping);
  });

  it('has empty payload', () => {
    const frame = encodePing();
    const decoded = decodeFrame(frame);
    expect(decoded.payload.length).toBe(0);
  });
});

describe('encodePong', () => {
  it('produces exactly 5 bytes', () => {
    const frame = encodePong();
    expect(frame.length).toBe(5);
  });

  it('has correct type', () => {
    const frame = encodePong();
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Pong);
  });

  it('has empty payload', () => {
    const frame = encodePong();
    const decoded = decodeFrame(frame);
    expect(decoded.payload.length).toBe(0);
  });
});

describe('encodeErrorFrame', () => {
  it('encodes error message', () => {
    const frame = encodeErrorFrame('Something went wrong');
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Error);
    expect(payloadToString(decoded.payload)).toBe('Something went wrong');
  });

  it('encodes empty error message', () => {
    const frame = encodeErrorFrame('');
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Error);
    expect(payloadToString(decoded.payload)).toBe('');
  });

  it('encodes unicode error message', () => {
    const frame = encodeErrorFrame('错误：连接失败 🚫');
    const decoded = decodeFrame(frame);
    expect(payloadToString(decoded.payload)).toBe('错误：连接失败 🚫');
  });
});

describe('encodeSnapshotFrame', () => {
  it('encodes Uint8Array payload', () => {
    const data = new Uint8Array([10, 20, 30, 40, 50]);
    const frame = encodeSnapshotFrame(data);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Snapshot);
    expect(decoded.payload).toEqual(data);
  });

  it('round-trips via decodeFrame', () => {
    const text = 'Terminal snapshot data here';
    const data = new TextEncoder().encode(text);
    const frame = encodeSnapshotFrame(data);
    const decoded = decodeFrame(frame);
    expect(decoded.type).toBe(FrameType.Snapshot);
    expect(payloadToString(decoded.payload)).toBe(text);
  });
});

describe('payloadToString', () => {
  it('decodes ASCII', () => {
    const bytes = new TextEncoder().encode('Hello');
    expect(payloadToString(bytes)).toBe('Hello');
  });

  it('decodes UTF-8', () => {
    const bytes = new TextEncoder().encode('Ελληνικά 中文 🎊');
    expect(payloadToString(bytes)).toBe('Ελληνικά 中文 🎊');
  });

  it('decodes empty payload', () => {
    expect(payloadToString(new Uint8Array(0))).toBe('');
  });
});
