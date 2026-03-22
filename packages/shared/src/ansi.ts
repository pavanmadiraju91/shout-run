/**
 * Strip ANSI escape codes and common control characters from text.
 * Keeps newlines and tabs for readability.
 */
export function stripAnsi(text: string): string {
  return (
    text
      // Strip CSI sequences (e.g., colors, cursor movement)
      .replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
      // Strip OSC sequences (e.g., terminal title changes)
      .replace(/\x1B\][^\x07\x1B]*(?:\x07|\x1B\\)/g, '')
      // Strip remaining single-char escape sequences + stray ESC
      .replace(/\x1B[@-Z\\-_]/g, '')
      .replace(/\x1B/g, '')
      // Normalize line endings before stripping control chars
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Strip control chars except \n (0x0A) and \t (0x09)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  );
}
