"""Known-values stream redactor for broadcast output."""

from __future__ import annotations

MIN_SECRET_LENGTH = 4
REDACTED = '[REDACTED]'


class StreamRedactor:
    """Exact string replacement redactor for known secret values.

    Collects secret values, then replaces them in output data. No regex
    on the output stream — avoids mangling ANSI escape sequences.

    Maintains an overlap buffer to catch secrets split across chunks.
    """

    def __init__(self) -> None:
        self._secrets: list[str] = []
        self._max_len = 0
        self._overlap = ''

    def add_secret(self, value: str) -> None:
        """Add a secret value. Values <= 3 chars are ignored."""
        trimmed = value.strip()
        if len(trimmed) < MIN_SECRET_LENGTH:
            return
        if trimmed in self._secrets:
            return
        self._secrets.append(trimmed)
        if len(trimmed) > self._max_len:
            self._max_len = len(trimmed)

    @property
    def has_secrets(self) -> bool:
        return len(self._secrets) > 0

    def redact(self, data: str) -> str:
        """Replace known secrets with [REDACTED].

        Uses an overlap buffer to handle secrets split across chunks.
        Feed chunks in order; each call returns the safe portion.
        """
        if not self._secrets:
            return data

        combined = self._overlap + data
        hold_back = self._max_len - 1

        # Redact the full combined string
        redacted = combined
        for secret in self._secrets:
            redacted = redacted.replace(secret, REDACTED)

        if hold_back > 0 and len(redacted) > hold_back:
            self._overlap = redacted[len(redacted) - hold_back:]
            return redacted[:len(redacted) - hold_back]

        if hold_back > 0:
            self._overlap = redacted
            return ''

        self._overlap = ''
        return redacted

    def flush(self) -> str:
        """Flush remaining overlap buffer (call at end of stream)."""
        if not self._overlap:
            return ''
        result = self._overlap
        for secret in self._secrets:
            result = result.replace(secret, REDACTED)
        self._overlap = ''
        return result
