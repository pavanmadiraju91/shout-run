'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { createSocket, type SocketCallbacks } from '@/lib/socket';
import { useTheme } from '@/components/ThemeProvider';

// GitHub Dark color palette
const DARK_THEME = {
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

// Cream/paper light theme (Solarized Light inspired)
const LIGHT_THEME = {
  background: '#faf9f7',
  foreground: '#1a1a1a',
  cursor: '#0969da',
  cursorAccent: '#faf9f7',
  selectionBackground: 'rgba(9, 105, 218, 0.2)',
  selectionForeground: '#1a1a1a',
  black: '#1a1a1a',
  red: '#cf222e',
  green: '#1a7f37',
  yellow: '#9a6700',
  blue: '#0969da',
  magenta: '#8250df',
  cyan: '#1b7c83',
  white: '#6e7781',
  brightBlack: '#57606a',
  brightRed: '#a40e26',
  brightGreen: '#116329',
  brightYellow: '#7d4e00',
  brightBlue: '#0550ae',
  brightMagenta: '#6639ba',
  brightCyan: '#136c72',
  brightWhite: '#8c959f',
};

interface TerminalProps {
  sessionId: string;
  isLive: boolean;
  sessionTitle?: string;
  onViewerCountChange?: (count: number) => void;
  replayMode?: boolean;
  onTerminalReady?: (xterm: XTerm) => void;
  onResizeReady?: (handler: (cols: number, rows: number) => void) => void;
}

export function Terminal({ sessionId, isLive, sessionTitle, onViewerCountChange, replayMode, onTerminalReady, onResizeReady }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const announceRef = useRef<HTMLDivElement>(null);
  const broadcasterSizeRef = useRef<{ cols: number; rows: number } | null>(null);
  const { theme } = useTheme();

  // Swap xterm theme when the global theme changes
  useEffect(() => {
    if (!xtermRef.current) return;
    xtermRef.current.options.theme = theme === 'light' ? LIGHT_THEME : DARK_THEME;
  }, [theme]);

  const handleOutput = useCallback((data: string) => {
    xtermRef.current?.write(data);
  }, []);

  /**
   * Calculate the optimal fontSize so that the broadcaster's cols×rows
   * fills the container without overflow, then resize xterm to match.
   *
   * Uses xterm's actual rendered cell dimensions (like asciinema-player)
   * instead of hardcoded character-width ratios for accurate sizing.
   */
  const fitToContainer = useCallback(() => {
    const container = terminalRef.current;
    const xterm = xtermRef.current;
    if (!container || !xterm) return;

    const size = broadcasterSizeRef.current;
    if (!size) {
      // No broadcaster size yet — use FitAddon for best fit
      fitAddonRef.current?.fit();
      return;
    }

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;
    if (containerW === 0 || containerH === 0) return;

    // Account for xterm padding (12px each side from globals.css .xterm rule)
    const availW = containerW - 24;
    const availH = containerH - 24;

    // Measure actual cell dimensions from xterm's renderer, then scale
    // fontSize proportionally to fit the broadcaster's grid.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dims = (xterm as any)._core?._renderService?.dimensions;
    const currentFontSize = xterm.options.fontSize ?? 14;

    let cellW: number;
    let cellH: number;

    if (dims?.css?.cell?.width && dims?.css?.cell?.height) {
      cellW = dims.css.cell.width;
      cellH = dims.css.cell.height;
    } else {
      // Fallback: approximate ratios (only on first render before renderer is ready)
      cellW = currentFontSize * 0.6;
      cellH = currentFontSize * (xterm.options.lineHeight ?? 1.2);
    }

    // Width-priority sizing (like asciinema-player fit:"width" default):
    // Size font to fill container width, let excess rows scroll in scrollback.
    const widthFont = Math.floor((availW / (size.cols * cellW)) * currentFontSize);
    const newFontSize = Math.max(12, Math.min(widthFont, 48));

    if (newFontSize !== xterm.options.fontSize) {
      xterm.options.fontSize = newFontSize;
    }

    // Calculate how many rows fit at this font size — excess content scrolls
    const scaledCellH = (cellH / currentFontSize) * newFontSize;
    const fittingRows = Math.max(1, Math.floor(availH / scaledCellH));
    const rows = Math.min(size.rows, fittingRows);

    if (xterm.cols !== size.cols || xterm.rows !== rows) {
      xterm.resize(size.cols, rows);
    }
  }, []);

  const handleResize = useCallback(
    (cols: number, rows: number) => {
      broadcasterSizeRef.current = { cols, rows };
      fitToContainer();
    },
    [fitToContainer],
  );

  const handleViewerCount = useCallback(
    (count: number) => {
      onViewerCountChange?.(count);
    },
    [onViewerCountChange],
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

    const initialTheme = theme === 'light' ? LIGHT_THEME : DARK_THEME;

    const xterm = new XTerm({
      theme: initialTheme,
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

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Initial fit
    requestAnimationFrame(() => fitToContainer());

    // Re-fit when the container resizes (e.g. window resize)
    const resizeObserver = new ResizeObserver(() => {
      fitToContainer();
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
    } else if (replayMode) {
      // External replay controller manages playback — expose the xterm instance and resize handler
      onTerminalReady?.(xterm);
      onResizeReady?.(handleResize);
    } else {
      // Legacy: internal replay for ended sessions
      fetchReplayData(sessionId, xterm, broadcasterSizeRef, fitToContainer);
    }

    return () => {
      resizeObserver.disconnect();
      socketRef.current?.disconnect();
      xterm.dispose();
    };
  }, [sessionId, isLive, replayMode, onTerminalReady, onResizeReady, handleOutput, handleViewerCount, handleResize, handleEnd, handleError, fitToContainer, theme]);

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

async function fetchReplayData(
  sessionId: string,
  xterm: XTerm,
  broadcasterSizeRef: React.MutableRefObject<{ cols: number; rows: number } | null>,
  fitToContainer: () => void,
) {
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
        broadcasterSizeRef.current = { cols: chunk.cols, rows: chunk.rows };
        fitToContainer();
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
