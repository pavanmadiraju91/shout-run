"""Binary WebSocket protocol for shout.run.

Frame format:
    [type: 1 byte][timestamp: 4 bytes uint32 big-endian][payload: variable]
"""

from __future__ import annotations

import struct
from enum import IntEnum

HEADER_SIZE = 5  # 1 byte type + 4 bytes timestamp


class FrameType(IntEnum):
    """WebSocket frame types."""
    Output = 0x01
    Meta = 0x02
    ViewerCount = 0x03
    End = 0x04
    Ping = 0x05
    Pong = 0x06
    Error = 0x07
    Resize = 0x08


def encode_frame(frame_type: FrameType, payload: bytes, timestamp: int = 0) -> bytes:
    """Encode a binary frame."""
    header = struct.pack('>BI', frame_type, timestamp)
    return header + payload


def decode_frame(data: bytes) -> tuple[FrameType, int, bytes]:
    """Decode a binary frame. Returns (type, timestamp, payload)."""
    if len(data) < HEADER_SIZE:
        raise ValueError(f'Frame too short: {len(data)} bytes')
    frame_type = FrameType(data[0])
    timestamp = struct.unpack('>I', data[1:5])[0]
    payload = data[5:]
    return frame_type, timestamp, payload


def encode_output_frame(data: str, timestamp_ms: int) -> bytes:
    """Encode terminal output."""
    return encode_frame(FrameType.Output, data.encode('utf-8'), timestamp_ms)


def encode_end_frame() -> bytes:
    """Encode session end."""
    return encode_frame(FrameType.End, b'')


def encode_resize_frame(cols: int, rows: int) -> bytes:
    """Encode terminal resize."""
    payload = struct.pack('>HH', cols, rows)
    return encode_frame(FrameType.Resize, payload)


def encode_pong() -> bytes:
    """Encode pong response."""
    return encode_frame(FrameType.Pong, b'')


def decode_viewer_count(payload: bytes) -> int:
    """Decode viewer count from payload."""
    return struct.unpack('>I', payload[:4])[0]
