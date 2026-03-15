import chalk from 'chalk';
import ora from 'ora';
import * as pty from 'node-pty';
import {
  encodeOutputFrame,
  encodeEndFrame,
  encodeResizeFrame,
  encodePong,
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
import { ReconnectingWebSocket } from '../lib/stream.js';
import { redactSecrets } from '../lib/secrets.js';

/** Env var prefixes that should never be exposed to a broadcast shell. */
const SENSITIVE_ENV_PREFIXES = [
  'AWS_SECRET',
  'AWS_SESSION_TOKEN',
  'DATABASE_URL',
  'GITHUB_TOKEN',
  'GH_TOKEN',
  'NPM_TOKEN',
  'NODE_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET',
  'PRIVATE_KEY',
  'SECRET_KEY',
  'ENCRYPTION_KEY',
  'JWT_SECRET',
  'SESSION_SECRET',
  'COOKIE_SECRET',
  'TURSO_AUTH_TOKEN',
  'CLOUDFLARE_API_TOKEN',
  'SENTRY_AUTH_TOKEN',
  'SLACK_TOKEN',
  'SLACK_BOT_TOKEN',
  'DISCORD_TOKEN',
  'TWILIO_AUTH_TOKEN',
  'SENDGRID_API_KEY',
  'MAILGUN_API_KEY',
];

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
  const isPiped = !process.stdin.isTTY;

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

  if (!isPiped) {
    console.log(chalk.dim('  Your terminal is now being shared. Type `exit` or press Ctrl+D to stop.'));
    console.log();
  }

  const stats: BroadcastStats = {
    bytesSent: 0,
    viewerCount: 0,
    startTime: Date.now(),
  };

  // Rate limiting
  const maxBytesPerSecond = DEFAULT_RATE_LIMITS.maxBytesPerSecond;
  let bytesThisSecond = 0;
  let lastSecondReset = Date.now();

  // Connect WebSocket
  const wsUrlWithAuth = `${session.wsUrl}?token=${encodeURIComponent(tokens.accessToken)}`;
  const ws = new ReconnectingWebSocket(wsUrlWithAuth);

  let buffer = '';
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isEnding = false;

  function flushBuffer(): void {
    if (buffer.length === 0) return;

    const now = Date.now();
    if (now - lastSecondReset >= 1000) {
      bytesThisSecond = 0;
      lastSecondReset = now;
    }

    const raw = buffer;
    buffer = '';

    // Redact secrets before sending to viewers
    const { output: data } = redactSecrets(raw);

    const bytes = Buffer.byteLength(data, 'utf-8');

    if (bytesThisSecond + bytes > maxBytesPerSecond) {
      setTimeout(() => {
        buffer = data + buffer;
        flushBuffer();
      }, 1000 - (now - lastSecondReset));
      return;
    }

    bytesThisSecond += bytes;
    stats.bytesSent += bytes;

    const timestampSec = Math.floor((Date.now() - stats.startTime) / 1000);
    const frame = encodeOutputFrame(data, timestampSec);
    ws.send(frame);
  }

  ws.on('message', (data) => {
    if (data instanceof ArrayBuffer) {
      try {
        const frame = decodeFrame(new Uint8Array(data));
        if (frame.type === FrameType.Ping) {
          ws.send(encodePong());
          return;
        }
        if (frame.type === FrameType.ViewerCount) {
          stats.viewerCount = decodeViewerCount(frame.payload);
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
    console.error(chalk.red(`WebSocket error: ${error.message}`));
  });

  ws.on('reconnecting', (attempt) => {
    process.stderr.write(`\r${chalk.yellow(`Reconnecting (attempt ${attempt})...`)}                    `);
  });

  ws.connect();

  function endSession(): void {
    if (isEnding) return;
    isEnding = true;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (buffer.length > 0) {
      flushBuffer();
    }

    try {
      ws.send(encodeEndFrame());
    } catch {
      // WebSocket may already be closed
    }

    fetch(`${API_BASE}/api/sessions/${session.sessionId}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokens!.accessToken}` },
    })
      .catch(() => {})
      .finally(() => {
        ws.close(WS_CLOSE.NORMAL, 'Session ended');

        console.log();
        console.log();
        console.log(chalk.bold('Broadcast ended'));
        console.log(
          chalk.dim(
            `  Duration: ${formatDuration(Date.now() - stats.startTime)} | ${formatBytes(stats.bytesSent)} sent`,
          ),
        );
        console.log();

        process.exit(0);
      });
  }

  if (isPiped) {
    // ── Pipe mode: read stdin and forward ──
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => {
      buffer += chunk;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flushBuffer, CHUNK_DEBOUNCE_MS);
    });

    process.stdin.on('end', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      flushBuffer();
      endSession();
    });

    if (process.stdout.columns && process.stdout.rows) {
      ws.on('open', () => {
        const resizeFrame = encodeResizeFrame(process.stdout.columns, process.stdout.rows);
        ws.send(resizeFrame);
      });
    }
  } else {
    // ── Interactive PTY mode: spawn a shell and capture everything ──
    const shell = process.env.SHELL || '/bin/bash';
    const cols = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;

    // Filter out undefined env values and strip known sensitive vars
    const cleanEnv: Record<string, string> = {};
    for (const [key, val] of Object.entries(process.env)) {
      if (val === undefined) continue;
      const upper = key.toUpperCase();
      if (SENSITIVE_ENV_PREFIXES.some((prefix) => upper.startsWith(prefix))) continue;
      cleanEnv[key] = val;
    }
    cleanEnv.SHOUT_SESSION = '1';

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols,
      rows,
      cwd: process.cwd(),
      env: cleanEnv,
    });

    // Send initial terminal size
    ws.on('open', () => {
      const resizeFrame = encodeResizeFrame(cols, rows);
      ws.send(resizeFrame);
    });

    // PTY output → local terminal + WebSocket
    ptyProcess.onData((data: string) => {
      // Write to local terminal so the user sees their own output
      process.stdout.write(data);

      // Buffer and send to WebSocket
      buffer += data;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(flushBuffer, CHUNK_DEBOUNCE_MS);
    });

    // User keyboard input → PTY
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (data: Buffer) => {
      ptyProcess.write(data.toString());
    });

    // Handle terminal resize
    process.stdout.on('resize', () => {
      const newCols = process.stdout.columns || 80;
      const newRows = process.stdout.rows || 24;
      ptyProcess.resize(newCols, newRows);
      const resizeFrame = encodeResizeFrame(newCols, newRows);
      ws.send(resizeFrame);
    });

    // PTY exits (user typed `exit` or Ctrl+D)
    ptyProcess.onExit(({ exitCode }) => {
      // Restore terminal
      process.stdin.setRawMode(false);
      endSession();
    });
  }

  process.on('SIGINT', endSession);
  process.on('SIGTERM', endSession);
}
