'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { createSocket, type SocketCallbacks } from '@/lib/socket';

// GitHub Dark color palette
const GITHUB_DARK_THEME = {
  background: '#0d1117',
  foreground: '#e6edf3',
  cursor: '#58a6ff',
  cursorAccent: '#0d1117',
  selectionBackground: 'rgba(88, 166, 255, 0.3)',
  selectionForeground: '#e6edf3',
  black: '#484f58',
  red: '#ff7b72',
  green: '#3fb950',
  yellow: '#d29922',
  blue: '#58a6ff',
  magenta: '#bc8cff',
  cyan: '#39c5cf',
  white: '#b1bac4',
  brightBlack: '#6e7681',
  brightRed: '#ffa198',
  brightGreen: '#56d364',
  brightYellow: '#e3b341',
  brightBlue: '#79c0ff',
  brightMagenta: '#d2a8ff',
  brightCyan: '#56d4dd',
  brightWhite: '#f0f6fc',
};

interface TerminalProps {
  sessionId: string;
  isLive: boolean;
  sessionTitle?: string;
  onViewerCountChange?: (count: number) => void;
}

export function Terminal({ sessionId, isLive, sessionTitle, onViewerCountChange }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const announceRef = useRef<HTMLDivElement>(null);

  const handleOutput = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const scaleTerminal = useCallback(() => {
    const container = terminalRef.current;
    if (!container) return;
    const xtermScreen = container.querySelector('.xterm-screen') as HTMLElement | null;
    if (!xtermScreen) return;

    // Temporarily remove scale to measure natural size
    xtermScreen.style.transform = '';
    const naturalW = xtermScreen.offsetWidth;
    const naturalH = xtermScreen.offsetHeight;
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    if (naturalW === 0 || naturalH === 0) return;

    const scale = Math.min(containerW / naturalW, containerH / naturalH, 1);
    xtermScreen.style.transform = `scale(${scale})`;
    xtermScreen.style.transformOrigin = 'top left';
  }, []);

  const handleResize = useCallback(
    (cols: number, rows: number) => {
      xtermRef.current?.resize(cols, rows);
      // Re-scale after the terminal's natural size changes
      requestAnimationFrame(scaleTerminal);
    },
    [scaleTerminal]
  );

  const handleViewerCount = useCallback(
    (count: number) => {
      onViewerCountChange?.(count);
    },
    [onViewerCountChange]
  );

  const handleEnd = useCallback(() => {
    xtermRef.current?.write('\r\n\x1b[90m--- Session ended ---\x1b[0m\r\n');
    if (announceRef.current) {
      announceRef.current.textContent = 'Session ended';
    }
  }, []);

  const handleError = useCallback((error: string) => {
    xtermRef.current?.write(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`);
    if (announceRef.current) {
      announceRef.current.textContent = `Error: ${error}`;
    }
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js with fixed dimensions (broadcaster will send real size via Resize frame)
    const xterm = new XTerm({
      theme: GITHUB_DARK_THEME,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Consolas, monospace',
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: false,
      cursorStyle: 'block',
      allowTransparency: true,
      scrollback: 5000,
      convertEol: true,
      cols: 80,
      rows: 24,
      screenReaderMode: true,
    });

    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    xtermRef.current = xterm;

    // Initial scale after xterm renders
    requestAnimationFrame(scaleTerminal);

    // Re-scale whenever the container size changes
    const resizeObserver = new ResizeObserver(() => {
      scaleTerminal();
    });
    resizeObserver.observe(terminalRef.current);

    // Connect to WebSocket if live
    if (isLive) {
      const callbacks: SocketCallbacks = {
        onOutput: handleOutput,
        onViewerCount: handleViewerCount,
        onResize: handleResize,
        onEnd: handleEnd,
        onError: handleError,
      };

      socketRef.current = createSocket(sessionId, callbacks);
      socketRef.current.connect();
    } else {
      // For ended sessions, fetch replay data
      fetchReplayData(sessionId, xterm);
    }

    return () => {
      resizeObserver.disconnect();
      socketRef.current?.disconnect();
      xterm.dispose();
    };
  }, [sessionId, isLive, handleOutput, handleViewerCount, handleResize, handleEnd, handleError, scaleTerminal]);

  const ariaLabel = sessionTitle ? `Terminal session: ${sessionTitle}` : 'Terminal session';

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      className="flex-1 relative bg-shout-bg overflow-hidden"
      style={{ minHeight: 0 }}
    >
      <div ref={terminalRef} className="absolute inset-0" />
      <div ref={announceRef} className="sr-only" aria-live="polite" />
    </div>
  );
}

async function fetchReplayData(sessionId: string, xterm: XTerm) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/replay`);

    if (!response.ok) {
      xterm.write('\x1b[90m--- Unable to load session replay ---\x1b[0m\r\n');
      return;
    }

    const json = await response.json();
    const replayData = json.data;

    if (!replayData?.chunks || replayData.chunks.length === 0) {
      xterm.write('\x1b[90m--- No data recorded for this session ---\x1b[0m\r\n');
      return;
    }

    // Play back the chunks with timing
    let lastTimestamp = 0;
    for (const chunk of replayData.chunks) {
      const delay = chunk.timestamp - lastTimestamp;
      if (delay > 0 && delay < 5000) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 100)));
      }
      if (chunk.type === 'resize' && chunk.cols && chunk.rows) {
        xterm.resize(chunk.cols, chunk.rows);
      } else if (chunk.data) {
        xterm.write(chunk.data);
      }
      lastTimestamp = chunk.timestamp;
    }

    xterm.write('\r\n\x1b[90m--- Session replay complete ---\x1b[0m\r\n');
  } catch (error) {
    console.error('Failed to fetch replay data:', error);
    xterm.write('\x1b[31m--- Failed to load session replay ---\x1b[0m\r\n');
  }
}
