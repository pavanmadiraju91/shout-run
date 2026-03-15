'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
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
  onViewerCountChange?: (count: number) => void;
}

export function Terminal({ sessionId, isLive, onViewerCountChange }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);

  const handleOutput = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  const handleResize = useCallback((cols: number, rows: number) => {
    xtermRef.current?.resize(cols, rows);
  }, []);

  const handleViewerCount = useCallback(
    (count: number) => {
      onViewerCountChange?.(count);
    },
    [onViewerCountChange]
  );

  const handleEnd = useCallback(() => {
    xtermRef.current?.write('\r\n\x1b[90m--- Session ended ---\x1b[0m\r\n');
  }, []);

  const handleError = useCallback((error: string) => {
    xtermRef.current?.write(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`);
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
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
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleWindowResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleWindowResize);

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
      window.removeEventListener('resize', handleWindowResize);
      socketRef.current?.disconnect();
      xterm.dispose();
    };
  }, [sessionId, isLive, handleOutput, handleViewerCount, handleResize, handleEnd, handleError]);

  return (
    <div
      ref={terminalRef}
      className="flex-1 bg-shout-bg overflow-hidden"
      style={{ minHeight: 0 }}
    />
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
      xterm.write(chunk.data);
      lastTimestamp = chunk.timestamp;
    }

    xterm.write('\r\n\x1b[90m--- Session replay complete ---\x1b[0m\r\n');
  } catch (error) {
    console.error('Failed to fetch replay data:', error);
    xterm.write('\x1b[31m--- Failed to load session replay ---\x1b[0m\r\n');
  }
}
