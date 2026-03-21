import chalk from 'chalk';
import ora from 'ora';
import * as pty from 'node-pty';
import { input, select } from '@inquirer/prompts';
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
import { login } from './login.js';
import { ReconnectingWebSocket } from '../lib/stream.js';
import { formatDuration, formatBytes } from '../lib/format.js';
import { stripSensitiveEnv } from '../lib/env.js';

const API_BASE = process.env.SHOUT_API_URL ?? 'https://api.shout.run';

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
  const isTTY = !isPiped;

  // Check authentication — auto-login if needed
  let tokens = await getToken();
  if (!tokens || !tokens.accessToken) {
    if (isTTY) {
      console.log();
      console.log(chalk.yellow('  Not logged in. Let\'s fix that...'));
      console.log();
      await login();
      tokens = await getToken();
      if (!tokens || !tokens.accessToken) {
        console.log(chalk.red('Login failed. Please try again.'));
        process.exit(1);
      }
      console.log();
    } else {
      console.log(chalk.red('Not logged in. Run `shout login` first.'));
      process.exit(1);
    }
  }

  // Interactive prompts when in TTY mode and no flags given
  if (isTTY && !options.title) {
    options.title = await input({
      message: 'Session title',
      default: `${tokens.username}'s session`,
    });
  }

  if (isTTY && !options.visibility) {
    options.visibility = await select({
      message: 'Visibility',
      choices: [
        { name: 'Public', value: 'public' as const },
        { name: 'Private', value: 'private' as const },
      ],
    });
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

  const WEB_BASE = process.env.SHOUT_WEB_URL ?? 'https://shout.run';
  const sessionUrl = `${WEB_BASE}/${tokens.username}/${session.sessionId}`;
  console.log();
  console.log(chalk.bold('  Live at:'));
  console.log(chalk.cyan(`  ${sessionUrl}`));
  console.log();

  // Countdown before PTY starts
  if (isTTY) {
    for (const n of [3, 2, 1]) {
      process.stdout.write(chalk.bold(`  Starting in ${n}...`));
      await new Promise((resolve) => setTimeout(resolve, 1000));
      process.stdout.write('\r\x1b[K');
    }
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

  // Max payload per WebSocket message — stay well under Cloudflare's 1 MB limit
  const MAX_CHUNK_BYTES = 64 * 1024; // 64 KB

  function sendChunk(data: string): void {
    const bytes = Buffer.byteLength(data, 'utf-8');
    stats.bytesSent += bytes;
    const timestampMs = Date.now() - stats.startTime;
    const frame = encodeOutputFrame(data, timestampMs);
    ws.send(frame);
  }

  function flushBuffer(): void {
    if (buffer.length === 0) return;

    const now = Date.now();
    if (now - lastSecondReset >= 1000) {
      bytesThisSecond = 0;
      lastSecondReset = now;
    }

    const raw = buffer;
    buffer = '';

    const totalBytes = Buffer.byteLength(raw, 'utf-8');

    if (bytesThisSecond + totalBytes > maxBytesPerSecond) {
      setTimeout(() => {
        buffer = raw + buffer;
        flushBuffer();
      }, 1000 - (now - lastSecondReset));
      return;
    }

    bytesThisSecond += totalBytes;

    // Split into chunks to avoid exceeding WebSocket message size limits
    if (totalBytes <= MAX_CHUNK_BYTES) {
      sendChunk(raw);
    } else {
      let offset = 0;
      while (offset < raw.length) {
        // Binary-safe slicing: walk forward until we hit the byte budget
        let end = offset + MAX_CHUNK_BYTES;
        if (end > raw.length) end = raw.length;
        // Avoid splitting a multi-byte char: step back if we're mid-surrogate
        while (end > offset && raw.charCodeAt(end - 1) >= 0xd800 && raw.charCodeAt(end - 1) <= 0xdbff) {
          end--;
        }
        sendChunk(raw.slice(offset, end));
        offset = end;
      }
    }
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

    if (code === WS_CLOSE.AUTH_FAILED) {
      ws.close();
      console.log();
      console.log(chalk.red('Authentication failed. Try `shout login` again.'));
    } else if (code === WS_CLOSE.RATE_LIMITED) {
      ws.close();
      console.log();
      console.log(chalk.red('Rate limited. Please try again later.'));
    } else if (code === WS_CLOSE.MAX_DURATION) {
      ws.close();
      console.log();
      console.log(chalk.yellow('Maximum session duration reached.'));
    }
    // Transient (1006, etc.) — silent, auto-reconnect handles it
  });

  ws.on('error', (error) => {
    console.error(chalk.red(`WebSocket error: ${error.message}`));
  });

  ws.on('reconnecting', (attempt) => {
    // Suppress the first reconnect attempt — transient drops are normal at startup
    if (attempt > 1) {
      process.stderr.write(`\r${chalk.yellow(`Reconnecting (attempt ${attempt})...`)}                    `);
    }
  });

  // Define endSession and register signal handlers early — before countdown and PTY spawn
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

  process.on('SIGINT', endSession);
  process.on('SIGTERM', endSession);
  process.on('SIGHUP', endSession);

  ws.connect();

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
        // Clear any reconnecting message
        process.stderr.write('\r\x1b[K');
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
    const cleanEnv = stripSensitiveEnv(process.env);

    let ptyProcess: pty.IPty | null = null;

    ws.on('open', () => {
      // Clear any reconnecting message
      process.stderr.write('\r\x1b[K');

      if (!ptyProcess) {
        // First connection — spawn the PTY
        const resizeFrame = encodeResizeFrame(cols, rows);
        ws.send(resizeFrame);

        ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-256color',
          cols,
          rows,
          cwd: process.cwd(),
          env: cleanEnv,
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
          ptyProcess!.write(data.toString());
        });

        // Handle terminal resize
        process.stdout.on('resize', () => {
          const newCols = process.stdout.columns || 80;
          const newRows = process.stdout.rows || 24;
          ptyProcess!.resize(newCols, newRows);
          const resizeFrame = encodeResizeFrame(newCols, newRows);
          ws.send(resizeFrame);
        });

        // PTY exits (user typed `exit` or Ctrl+D)
        ptyProcess.onExit(({ exitCode }) => {
          // Restore terminal
          process.stdin.setRawMode(false);
          endSession();
        });
      } else {
        // Reconnection — re-send current terminal size
        const resizeFrame = encodeResizeFrame(
          process.stdout.columns || 80,
          process.stdout.rows || 24,
        );
        ws.send(resizeFrame);
      }
    });
  }
}
