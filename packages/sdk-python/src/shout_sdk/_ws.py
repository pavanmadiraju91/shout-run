"""Reconnecting WebSocket client for shout.run."""

from __future__ import annotations

import logging
import threading
import time
from typing import Callable

import websocket

logger = logging.getLogger('shout_sdk')


class ReconnectingWebSocket:
    """WebSocket with automatic reconnection and send queue."""

    def __init__(
        self,
        url: str,
        *,
        max_reconnect_delay: float = 30.0,
        initial_reconnect_delay: float = 1.0,
        ping_interval: float = 30.0,
    ) -> None:
        self.url = url
        self._max_reconnect_delay = max_reconnect_delay
        self._initial_reconnect_delay = initial_reconnect_delay
        self._ping_interval = ping_interval

        self._ws: websocket.WebSocketApp | None = None
        self._thread: threading.Thread | None = None
        self._connected = False
        self._closed = False
        self._reconnect_attempts = 0
        self._reconnect_delay = initial_reconnect_delay
        self._send_queue: list[bytes] = []
        self._lock = threading.Lock()

        # Callbacks
        self.on_open: Callable[[], None] | None = None
        self.on_close: Callable[[int, str], None] | None = None
        self.on_message: Callable[[bytes], None] | None = None
        self.on_error: Callable[[Exception], None] | None = None
        self.on_reconnecting: Callable[[int], None] | None = None

    @property
    def connected(self) -> bool:
        return self._connected

    def connect(self) -> None:
        """Start the WebSocket connection."""
        if self._closed:
            return
        self._start_ws()

    def _start_ws(self) -> None:
        self._ws = websocket.WebSocketApp(
            self.url,
            on_open=self._handle_open,
            on_close=self._handle_close,
            on_message=self._handle_message,
            on_error=self._handle_error,
        )
        self._thread = threading.Thread(
            target=self._ws.run_forever,
            kwargs={'ping_interval': self._ping_interval},
            daemon=True,
        )
        self._thread.start()

    def _handle_open(self, ws: websocket.WebSocketApp) -> None:
        self._connected = True
        self._reconnect_attempts = 0
        self._reconnect_delay = self._initial_reconnect_delay
        self._flush_queue()
        if self.on_open:
            self.on_open()

    def _handle_close(self, ws: websocket.WebSocketApp, code: int | None, reason: str | None) -> None:
        self._connected = False
        if self.on_close:
            self.on_close(code or 0, reason or '')
        if not self._closed:
            self._schedule_reconnect()

    def _handle_message(self, ws: websocket.WebSocketApp, message: bytes | str) -> None:
        if isinstance(message, str):
            message = message.encode('utf-8')
        if self.on_message:
            self.on_message(message)

    def _handle_error(self, ws: websocket.WebSocketApp, error: Exception) -> None:
        if self.on_error:
            self.on_error(error)

    def send(self, data: bytes) -> None:
        """Send binary data, queueing if not connected."""
        with self._lock:
            if self._connected and self._ws:
                try:
                    self._ws.send(data, opcode=websocket.ABNF.OPCODE_BINARY)
                except Exception:
                    self._send_queue.append(data)
            else:
                self._send_queue.append(data)

    def close(self, code: int = 1000, reason: str = '') -> None:
        """Close the connection permanently."""
        self._closed = True
        if self._ws:
            try:
                self._ws.close()
            except Exception:
                pass
            self._ws = None

    def _flush_queue(self) -> None:
        with self._lock:
            while self._send_queue and self._connected and self._ws:
                data = self._send_queue.pop(0)
                try:
                    self._ws.send(data, opcode=websocket.ABNF.OPCODE_BINARY)
                except Exception:
                    self._send_queue.insert(0, data)
                    break

    def _schedule_reconnect(self) -> None:
        if self._closed:
            return
        self._reconnect_attempts += 1
        if self.on_reconnecting:
            self.on_reconnecting(self._reconnect_attempts)

        delay = self._reconnect_delay
        self._reconnect_delay = min(self._reconnect_delay * 2, self._max_reconnect_delay)

        timer = threading.Timer(delay, self._start_ws)
        timer.daemon = True
        timer.start()
