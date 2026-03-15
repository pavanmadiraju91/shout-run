import chalk from 'chalk';
import ora from 'ora';
import {
  encodeOutputFrame,
  encodeEndFrame,
  encodeResizeFrame,
  decodeFrame,
  decodeViewerCount,
  FrameType,
  CHUNK_DEBOUNCE_MS,
  WS_CLOSE,
  DEFAULT_RATE_LIMITS,
  type CreateSessionResponse,
  type ApiResponse,
} from '@shout/shared';
import { getToken } from '../lib/auth.js';
import { redactSecrets } from '../lib/secrets.js';
import { ReconnectingWebSocket } from '../lib/stream.js';

const API_BASE = process.env.SHOUT_API_URL ?? 'https://shout-worker.pavannandanmadiraju.workers.dev';

interface BroadcastOptions {
  title?: string;
  visibility?: 'public' | 'followers' | 'private';
  tags?: string[];
}

interface BroadcastStats {
  bytesSent: number;
  viewerCount: number;
  startTime: number;
  secretsRedacted: number;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function createSession(
  accessToken: string,
  options: BroadcastOptions,
): Promise<CreateSessionResponse> {
  const response = await fetch(`${API_BASE}/api/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: options.title,
      visibility: options.visibility ?? 'public',
      tags: options.tags ?? [],
    }),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error.error ?? `Failed to create session: ${response.status}`);
  }

  const result = (await response.json()) as ApiResponse<CreateSessionResponse>;
  if (!result.ok || !result.data) {
    throw new Error(result.error ?? 'Failed to create session');
  }

  return result.data;
}

export async function broadcast(options: BroadcastOptions = {}): Promise<void> {
  // Check if stdin is a TTY (not piped)
  if (process.stdin.isTTY) {
    console.log(chalk.yellow('No input detected. Pipe a command to broadcast:'));
    console.log();
    console.log(chalk.dim('  Example: npm test | shout'));
    console.log(chalk.dim('           make build 2>&1 | shout'));
    console.log();
    process.exit(1);
  }

  // Check authentication
  const tokens = await getToken();
  if (!tokens || !tokens.accessToken) {
    console.log(chalk.red('Not logged in. Run `shout login` first.'));
    process.exit(1);
  }

  const spinner = ora('Creating broadcast session...').start();

  let session: CreateSessionResponse;
  try {
    session = await createSession(tokens.accessToken, options);
    spinner.succeed('Session created');
  } catch (error) {
    spinner.fail('Failed to create session');
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(chalk.red(message));
    process.exit(1);
  }

  const WEB_BASE = process.env.SHOUT_WEB_URL ?? 'https://shout-web-delta.vercel.app';
  const sessionUrl = `${WEB_BASE}/${tokens.username}/${session.sessionId}`;
  console.log();
  console.log(chalk.bold('Broadcasting live at:'));
  console.log(chalk.cyan(`  ${sessionUrl}`));
  console.log();

  const stats: BroadcastStats = {
    bytesSent: 0,
    viewerCount: 0,
    startTime: Date.now(),
    secretsRedacted: 0,
  };

  // Rate limiting
  const maxBytesPerSecond = DEFAULT_RATE_LIMITS.maxBytesPerSecond;
  let bytesThisSecond = 0;
  let lastSecondReset = Date.now();

  // Connect WebSocket — pass token as query param (Cloudflare Workers don't support custom WS headers)
  const wsUrlWithAuth = `${session.wsUrl}?token=${encodeURIComponent(tokens.accessToken)}`;
  const ws = new ReconnectingWebSocket(wsUrlWithAuth);

  let buffer = '';
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isEnding = false;

  function updateStatus(): void {
    const duration = formatDuration(Date.now() - stats.startTime);
    const bytes = formatBytes(stats.bytesSent);
    process.stderr.write(
      `\r${chalk.dim(`[${duration}]`)} ${chalk.green(`${stats.viewerCount} viewers`)} ${chalk.dim(`| ${bytes} sent`)}${stats.secretsRedacted > 0 ? chalk.yellow(` | ${stats.secretsRedacted} secrets redacted`) : ''}   `,
    );
  }

  function flushBuffer(): void {
    if (buffer.length === 0) return;

    // Rate limiting check
    const now = Date.now();
    if (now - lastSecondReset >= 1000) {
      bytesThisSecond = 0;
      lastSecondReset = now;
    }

    const data = buffer;
    buffer = '';

    // Redact secrets
    const { output, matches } = redactSecrets(data);
    stats.secretsRedacted += matches.length;

    const bytes = Buffer.byteLength(output, 'utf-8');

    // Check rate limit
    if (bytesThisSecond + bytes > maxBytesPerSecond) {
      // Delay sending
      setTimeout(() => {
        buffer = output + buffer;
        flushBuffer();
      }, 1000 - (now - lastSecondReset));
      return;
    }

    bytesThisSecond += bytes;
    stats.bytesSent += bytes;

    const timestampSec = Math.floor((Date.now() - stats.startTime) / 1000);
    const frame = encodeOutputFrame(output, timestampSec);
    ws.send(frame);

    updateStatus();
  }

  ws.on('open', () => {
    // Send initial terminal size if available
    if (process.stdout.columns && process.stdout.rows) {
      const resizeFrame = encodeResizeFrame(process.stdout.columns, process.stdout.rows);
      ws.send(resizeFrame);
    }
  });

  ws.on('message', (data) => {
    if (data instanceof ArrayBuffer) {
      try {
        const frame = decodeFrame(new Uint8Array(data));
        if (frame.type === FrameType.ViewerCount) {
          stats.viewerCount = decodeViewerCount(frame.payload);
          updateStatus();
        }
      } catch {
        // Ignore decode errors
      }
    }
  });

  ws.on('close', (code, reason) => {
    if (isEnding) return;

    console.log();
    if (code === WS_CLOSE.AUTH_FAILED) {
      console.log(chalk.red('Authentication failed. Try `shout login` again.'));
    } else if (code === WS_CLOSE.RATE_LIMITED) {
      console.log(chalk.red('Rate limited. Please try again later.'));
    } else if (code === WS_CLOSE.MAX_DURATION) {
      console.log(chalk.yellow('Maximum session duration reached.'));
    } else if (code !== WS_CLOSE.NORMAL && code !== WS_CLOSE.GOING_AWAY) {
      console.log(chalk.red(`Connection closed: ${reason || code}`));
    }
  });

  ws.on('error', (error) => {
    console.error();
    console.error(chalk.red(`WebSocket error: ${error.message}`));
  });

  ws.on('reconnecting', (attempt) => {
    process.stderr.write(`\r${chalk.yellow(`Reconnecting (attempt ${attempt})...`)}                    `);
  });

  ws.connect();

  // Read stdin
  process.stdin.setEncoding('utf-8');
  process.stdin.on('data', (chunk: string) => {
    buffer += chunk;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(flushBuffer, CHUNK_DEBOUNCE_MS);
  });

  process.stdin.on('end', () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    flushBuffer();
    endSession();
  });

  // Handle terminal resize
  process.stdout.on('resize', () => {
    if (process.stdout.columns && process.stdout.rows) {
      const resizeFrame = encodeResizeFrame(process.stdout.columns, process.stdout.rows);
      ws.send(resizeFrame);
    }
  });

  // Graceful shutdown
  function endSession(): void {
    if (isEnding) return;
    isEnding = true;

    // Flush any remaining buffer
    if (buffer.length > 0) {
      flushBuffer();
    }

    // Send end frame
    ws.send(encodeEndFrame());

    // Close after a short delay to ensure end frame is sent
    setTimeout(() => {
      ws.close(WS_CLOSE.NORMAL, 'Session ended');

      console.log();
      console.log();
      console.log(chalk.bold('Broadcast ended'));
      console.log(
        chalk.dim(
          `  Duration: ${formatDuration(Date.now() - stats.startTime)} | ${formatBytes(stats.bytesSent)} sent`,
        ),
      );
      if (stats.secretsRedacted > 0) {
        console.log(chalk.yellow(`  ${stats.secretsRedacted} potential secrets were redacted`));
      }
      console.log();

      process.exit(0);
    }, 100);
  }

  process.on('SIGINT', endSession);
  process.on('SIGTERM', endSession);
}
