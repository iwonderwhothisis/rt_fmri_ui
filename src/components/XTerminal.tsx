import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { cn } from '@/lib/utils';
import type { TerminalStatus, ServerMessage, ClientMessage } from '@/types/terminal';

interface XTerminalProps {
  sessionId: string;
  initialCommand?: string;
  onStatusChange?: (status: TerminalStatus) => void;
  onExit?: (exitCode: number) => void;
  className?: string;
  disabled?: boolean;
}

export function XTerminal({
  sessionId,
  initialCommand,
  onStatusChange,
  onExit,
  className,
  disabled = false,
}: XTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid dependency issues
  const onStatusChangeRef = useRef(onStatusChange);
  const onExitRef = useRef(onExit);
  onStatusChangeRef.current = onStatusChange;
  onExitRef.current = onExit;

  useEffect(() => {
    if (!terminalRef.current || disabled) return;

    // Initialize terminal
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#4ade80',
        cursor: '#4ade80',
        cursorAccent: '#0a0a0a',
        selectionBackground: '#4ade8040',
      },
      scrollback: 5000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);

    // Initial fit
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Build WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = new URL(`${protocol}//${window.location.host}/ws`);
    wsUrl.searchParams.set('sessionId', sessionId);
    if (initialCommand) {
      wsUrl.searchParams.set('initialCommand', initialCommand);
    }

    // Connect WebSocket
    onStatusChangeRef.current?.('connecting');
    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    ws.onopen = () => {
      onStatusChangeRef.current?.('connected');
      // Send initial resize
      if (term && ws.readyState === WebSocket.OPEN) {
        const msg: ClientMessage = {
          type: 'resize',
          sessionId,
          cols: term.cols,
          rows: term.rows,
        };
        ws.send(JSON.stringify(msg));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        if (msg.type === 'output' && msg.data) {
          term.write(msg.data);
        } else if (msg.type === 'exit') {
          onExitRef.current?.(msg.exitCode ?? 0);
        }
      } catch (err) {
        console.error('[XTerminal] Error parsing message:', err);
      }
    };

    ws.onclose = () => {
      onStatusChangeRef.current?.('disconnected');
    };

    ws.onerror = (err) => {
      console.error('[XTerminal] WebSocket error:', err);
    };

    // Forward terminal input to WebSocket
    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Convert carriage return to newline for shell compatibility
        const normalizedData = data === '\r' ? '\n' : data;
        const msg: ClientMessage = { type: 'input', sessionId, data: normalizedData };
        ws.send(JSON.stringify(msg));
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        const msg: ClientMessage = {
          type: 'resize',
          sessionId,
          cols: term.cols,
          rows: term.rows,
        };
        ws.send(JSON.stringify(msg));
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize events
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(handleResize, 50);
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      dataDisposable.dispose();
      resizeObserver.disconnect();
      ws.close();
      term.dispose();
      termRef.current = null;
      wsRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, initialCommand, disabled]);

  return (
    <div
      ref={terminalRef}
      className={cn(
        'h-full w-full min-h-[120px] rounded-lg overflow-hidden',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    />
  );
}
