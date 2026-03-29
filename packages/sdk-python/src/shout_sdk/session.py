"""ShoutSession — main SDK entry point."""

from __future__ import annotations

import logging
import threading
import time
from enum import Enum
from typing import Any, Callable
from urllib.parse import urlencode

import requests

from .protocol import (
    FrameType,
    decode_frame,
    decode_viewer_count,
    encode_end_frame,
    encode_output_frame,
    encode_pong,
    encode_resize_frame,
)
from ._ws import ReconnectingWebSocket
from .redact import StreamRedactor

logger = logging.getLogger('shout_sdk')

# Constants matching @shout/shared
CHUNK_DEBOUNCE_S = 0.016  # 16ms
MAX_BYTES_PER_SECOND = 100 * 1024  # 100KB/s
MAX_CHUNK_BYTES = 64 * 1024  # 64KB
WS_CLOSE_NORMAL = 1000


class SessionState(str, Enum):
    """Session lifecycle states."""
    IDLE = 'idle'
    CONNECTING = 'connecting'
    LIVE = 'live'
    ENDING = 'ending'
    ENDED = 'ended'


class ShoutSession:
    """Broadcast terminal output to shout.run.

    Example::

        session = ShoutSession(api_key='shout_sk_...')
        info = session.start(title='My Agent')
        session.write('hello world\\r\\n')
        session.end()
    """

    def __init__(
        self,
        api_key: str,
        *,
        title: str = 'SDK Session',
        visibility: str = 'public',
        cols: int = 80,
        rows: int = 24,
        api_url: str = 'https://api.shout.run',
        redact_secrets: list[str] | None = None,
    ) -> None:
        self.api_key = api_key
        self.title = title
        self.visibility = visibility
        self.cols = cols
        self.rows = rows
        self.api_url = api_url.rstrip('/')

        self._session_id: str | None = None
        self._ws: ReconnectingWebSocket | None = None
        self._state = SessionState.IDLE
        self._start_time = 0.0
        self._viewer_count = 0

        # Buffering
        self._buffer = ''
        self._buffer_lock = threading.Lock()
        self._debounce_timer: threading.Timer | None = None

        # Rate limiting
        self._bytes_this_second = 0
        self._last_second_reset = 0.0

        # Event callbacks
        self._callbacks: dict[str, list[Callable[..., Any]]] = {}

        # Secret redaction
        self._redactor = StreamRedactor()
        if redact_secrets:
            for secret in redact_secrets:
                self._redactor.add_secret(secret)

    @property
    def state(self) -> SessionState:
        return self._state

    @property
    def viewers(self) -> int:
        return self._viewer_count

    @property
    def session_id(self) -> str | None:
        return self._session_id

    def on(self, event: str, callback: Callable[..., Any]) -> 'ShoutSession':
        """Register an event callback. Returns self for chaining.

        Events: connected, disconnected, reconnecting, viewers, error, state_change
        """
        self._callbacks.setdefault(event, []).append(callback)
        return self

    def _emit(self, event: str, *args: Any) -> None:
        for cb in self._callbacks.get(event, []):
            try:
                cb(*args)
            except Exception as e:
                logger.warning('Event callback error (%s): %s', event, e)

    def _set_state(self, state: SessionState) -> None:
        self._state = state
        self._emit('state_change', state)

    def start(self) -> dict[str, str]:
        """Create session and connect WebSocket.

        Returns:
            dict with 'session_id', 'url', and 'ws_url' keys.

        Raises:
            RuntimeError: If session is not in idle state.
            requests.HTTPError: If session creation fails.
        """
        if self._state != SessionState.IDLE:
            raise RuntimeError(f'Cannot start session in state: {self._state.value}')

        self._set_state(SessionState.CONNECTING)

        # 1. Create session via HTTP
        try:
            resp = requests.post(
                f'{self.api_url}/api/sessions',
                headers={
                    'Authorization': f'Bearer {self.api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'title': self.title,
                    'visibility': self.visibility,
                },
                timeout=30,
            )
        except Exception as e:
            self._set_state(SessionState.IDLE)
            raise RuntimeError(f'Failed to create session: {e}') from e

        if not resp.ok:
            self._set_state(SessionState.IDLE)
            error = resp.json().get('error', f'HTTP {resp.status_code}')
            raise RuntimeError(f'Failed to create session: {error}')

        result = resp.json()
        if not result.get('ok') or not result.get('data'):
            self._set_state(SessionState.IDLE)
            raise RuntimeError(result.get('error', 'Failed to create session'))

        data = result['data']
        self._session_id = data['sessionId']
        self._start_time = time.time()
        self._last_second_reset = self._start_time

        # 2. Connect WebSocket
        ws_url = f"{data['wsUrl']}?token={self.api_key}"
        self._ws = ReconnectingWebSocket(ws_url)

        self._ws.on_open = self._on_ws_open
        self._ws.on_close = self._on_ws_close
        self._ws.on_message = self._on_ws_message
        self._ws.on_error = self._on_ws_error
        self._ws.on_reconnecting = lambda attempt: self._emit('reconnecting', attempt)

        self._ws.connect()

        # Wait briefly for connection
        deadline = time.time() + 5.0
        while not self._ws.connected and time.time() < deadline:
            time.sleep(0.05)

        # Build viewer URL
        web_base = self.api_url.replace('api.', '').rstrip('/')
        info = {
            'session_id': self._session_id,
            'url': f'{web_base}/{self._session_id}',
            'ws_url': data['wsUrl'],
        }
        return info

    def write(self, data: str | bytes) -> None:
        """Send terminal output. Automatically buffered, rate-limited, and chunked."""
        if self._state not in (SessionState.LIVE, SessionState.CONNECTING):
            return

        text = data.decode('utf-8') if isinstance(data, bytes) else data
        safe = self._redactor.redact(text)

        if safe:
            with self._buffer_lock:
                self._buffer += safe

        # Debounce flush
        if self._debounce_timer:
            self._debounce_timer.cancel()
        self._debounce_timer = threading.Timer(CHUNK_DEBOUNCE_S, self._flush_buffer)
        self._debounce_timer.daemon = True
        self._debounce_timer.start()

    def add_secret(self, value: str) -> None:
        """Add a secret value to redact from broadcast output at runtime."""
        self._redactor.add_secret(value)

    def resize(self, cols: int, rows: int) -> None:
        """Update terminal dimensions."""
        self.cols = cols
        self.rows = rows
        if self._ws and self._state == SessionState.LIVE:
            self._ws.send(encode_resize_frame(cols, rows))

    def end(self) -> None:
        """Flush buffer, end session, close connection."""
        if self._state in (SessionState.ENDED, SessionState.ENDING):
            return

        self._set_state(SessionState.ENDING)

        # Cancel debounce and flush
        if self._debounce_timer:
            self._debounce_timer.cancel()
        remaining = self._redactor.flush()
        if remaining:
            with self._buffer_lock:
                self._buffer += remaining
        self._flush_buffer()

        # Send end frame
        if self._ws:
            try:
                self._ws.send(encode_end_frame())
            except Exception:
                pass

        # End session via HTTP
        if self._session_id:
            try:
                requests.post(
                    f'{self.api_url}/api/sessions/{self._session_id}/end',
                    headers={'Authorization': f'Bearer {self.api_key}'},
                    timeout=10,
                )
            except Exception:
                pass

        # Close WebSocket
        if self._ws:
            self._ws.close(WS_CLOSE_NORMAL, 'Session ended')
            self._ws = None

        self._set_state(SessionState.ENDED)

    @staticmethod
    def delete_session(api_key: str, session_id: str, *, api_url: str = 'https://api.shout.run') -> None:
        """Delete an ended session. Only the session owner can delete it.

        Args:
            api_key: API key for authentication.
            session_id: The session ID to delete.
            api_url: API base URL (default: https://api.shout.run).

        Raises:
            RuntimeError: If the delete request fails.
        """
        api_url = api_url.rstrip('/')
        resp = requests.delete(
            f'{api_url}/api/sessions/{session_id}',
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=10,
        )
        if not resp.ok:
            try:
                error = resp.json().get('error', str(resp.status_code))
            except Exception:
                error = str(resp.status_code)
            raise RuntimeError(f'Failed to delete session: {error}')

    @staticmethod
    def search_sessions(
        api_key: str,
        query: str,
        *,
        tags: list[str] | None = None,
        status: str | None = None,
        limit: int = 20,
        cursor: str | None = None,
        api_url: str = 'https://api.shout.run',
    ) -> list[dict[str, Any]]:
        """Search for sessions by query, tags, and status.

        Args:
            api_key: API key for authentication.
            query: Search query (matches title and description).
            tags: Optional list of tags to filter by (any match).
            status: Optional status filter ('live' or 'ended').
            limit: Maximum results (1-50, default: 20).
            cursor: Cursor for pagination (session ID).
            api_url: API base URL (default: https://api.shout.run).

        Returns:
            List of session dicts with id, title, description, tags, username, status, etc.

        Raises:
            RuntimeError: If the search request fails.
        """
        api_url = api_url.rstrip('/')
        params: dict[str, str] = {'q': query}
        if tags:
            params['tags'] = ','.join(tags)
        if status:
            params['status'] = status
        if limit:
            params['limit'] = str(limit)
        if cursor:
            params['cursor'] = cursor

        resp = requests.get(
            f'{api_url}/api/sessions/search',
            params=params,
            timeout=30,
        )
        if not resp.ok:
            try:
                error = resp.json().get('error', str(resp.status_code))
            except Exception:
                error = str(resp.status_code)
            raise RuntimeError(f'Search failed: {error}')

        result = resp.json()
        if not result.get('ok'):
            raise RuntimeError(result.get('error', 'Search failed'))
        return result.get('data', [])

    @staticmethod
    def get_session_content(
        api_key: str,
        session_id: str,
        *,
        api_url: str = 'https://api.shout.run',
    ) -> dict[str, Any]:
        """Get session metadata and plain-text transcript.

        Args:
            api_key: API key for authentication.
            session_id: The session ID to fetch.
            api_url: API base URL (default: https://api.shout.run).

        Returns:
            Dict with 'session' (metadata) and 'transcript' (plain text) keys.

        Raises:
            RuntimeError: If the request fails.
        """
        api_url = api_url.rstrip('/')
        resp = requests.get(
            f'{api_url}/api/sessions/{session_id}/content',
            headers={'Authorization': f'Bearer {api_key}'},
            timeout=30,
        )
        if not resp.ok:
            try:
                error = resp.json().get('error', str(resp.status_code))
            except Exception:
                error = str(resp.status_code)
            raise RuntimeError(f'Failed to get session content: {error}')

        result = resp.json()
        if not result.get('ok') or not result.get('data'):
            raise RuntimeError(result.get('error', 'Failed to get session content'))
        return result['data']

    def __enter__(self) -> 'ShoutSession':
        return self

    def __exit__(self, *args: Any) -> None:
        if self._state not in (SessionState.ENDED, SessionState.IDLE):
            self.end()

    # ── Private ──────────────────────────────────────────────

    def _on_ws_open(self) -> None:
        self._set_state(SessionState.LIVE)
        if self._ws:
            self._ws.send(encode_resize_frame(self.cols, self.rows))
        self._emit('connected')

    def _on_ws_close(self, code: int, reason: str) -> None:
        if self._state not in (SessionState.ENDING, SessionState.ENDED):
            self._emit('disconnected', code, reason)

    def _on_ws_message(self, data: bytes) -> None:
        try:
            frame_type, _, payload = decode_frame(data)
            if frame_type == FrameType.Ping:
                if self._ws:
                    self._ws.send(encode_pong())
            elif frame_type == FrameType.ViewerCount:
                self._viewer_count = decode_viewer_count(payload)
                self._emit('viewers', self._viewer_count)
            elif frame_type == FrameType.Error:
                self._emit('error', RuntimeError(payload.decode('utf-8', errors='replace')))
        except Exception:
            pass

    def _on_ws_error(self, error: Exception) -> None:
        self._emit('error', error)

    def _send_chunk(self, text: str) -> None:
        if not self._ws:
            return
        timestamp_ms = int((time.time() - self._start_time) * 1000)
        frame = encode_output_frame(text, timestamp_ms)
        self._ws.send(frame)

    def _flush_buffer(self) -> None:
        with self._buffer_lock:
            if not self._buffer or not self._ws:
                return
            raw = self._buffer
            self._buffer = ''

        now = time.time()
        if now - self._last_second_reset >= 1.0:
            self._bytes_this_second = 0
            self._last_second_reset = now

        total_bytes = len(raw.encode('utf-8'))

        # Rate limiting
        if self._bytes_this_second + total_bytes > MAX_BYTES_PER_SECOND:
            remaining = 1.0 - (now - self._last_second_reset)
            if remaining > 0:
                with self._buffer_lock:
                    self._buffer = raw + self._buffer
                timer = threading.Timer(remaining, self._flush_buffer)
                timer.daemon = True
                timer.start()
                return

        self._bytes_this_second += total_bytes

        # Chunk large payloads
        if total_bytes <= MAX_CHUNK_BYTES:
            self._send_chunk(raw)
        else:
            offset = 0
            while offset < len(raw):
                end = offset + MAX_CHUNK_BYTES
                if end > len(raw):
                    end = len(raw)
                # Avoid splitting surrogate pairs
                while end > offset and 0xD800 <= ord(raw[end - 1]) <= 0xDBFF:
                    end -= 1
                self._send_chunk(raw[offset:end])
                offset = end
