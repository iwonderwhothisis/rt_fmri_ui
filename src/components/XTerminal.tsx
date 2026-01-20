import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { cn } from '@/lib/utils';
import { getWsBaseUrl } from '@/lib/apiBase';
import type { TerminalStatus, ServerMessage, ClientMessage } from '@/types/terminal';

// UUID generator with fallback for environments without crypto.randomUUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface CommandResult {
  exitCode: number;
}

export interface TerminalHandle {
  sendCommand: (command: string) => void;
  executeCommand: (command: string, timeoutMs?: number) => Promise<CommandResult>;
}

interface XTerminalProps {
  sessionId: string;
  initialCommand?: string;
  onStatusChange?: (status: TerminalStatus) => void;
  onExit?: (exitCode: number) => void;
  onReady?: (handle: TerminalHandle) => void;
  className?: string;
  disabled?: boolean;
}

export function XTerminal({
  sessionId,
  initialCommand,
  onStatusChange,
  onExit,
  onReady,
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
  const onReadyRef = useRef(onReady);
  onStatusChangeRef.current = onStatusChange;
  onExitRef.current = onExit;
  onReadyRef.current = onReady;

  // Track pending commands waiting for completion
  const pendingCommandsRef = useRef<Map<string, {
    resolve: (result: CommandResult) => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
  }>>(new Map());

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
      disableStdin: false,  // Explicitly enable input
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
    const defaultBase = `${protocol}//${window.location.host}`;
    const wsBase = getWsBaseUrl() || defaultBase;
    const wsUrl = new URL(`${wsBase}/ws`);
    wsUrl.searchParams.set('sessionId', sessionId);
    if (initialCommand) {
      wsUrl.searchParams.set('initialCommand', initialCommand);
    }

    // Connect WebSocket
    onStatusChangeRef.current?.('connecting');
    const ws = new WebSocket(wsUrl.toString());
    wsRef.current = ws;

    // Create terminal handle for sending commands
    const handle: TerminalHandle = {
      // Fire-and-forget command (legacy behavior)
      sendCommand: (command: string) => {
        if (ws.readyState === WebSocket.OPEN) {
          const msg: ClientMessage = { type: 'command', sessionId, command };
          ws.send(JSON.stringify(msg));
        } else {
          console.warn('[XTerminal] Cannot send command - WebSocket not connected');
        }
      },

      // Promise-based command execution with completion tracking
      executeCommand: (command: string, timeoutMs: number = 5 * 60 * 1000): Promise<CommandResult> => {
        return new Promise((resolve, reject) => {
          if (ws.readyState !== WebSocket.OPEN) {
            reject(new Error('WebSocket not connected'));
            return;
          }

          // Generate unique command ID
          const commandId = generateUUID();

          // Set timeout for command
          const timeoutId = setTimeout(() => {
            if (pendingCommandsRef.current.has(commandId)) {
              pendingCommandsRef.current.delete(commandId);
              reject(new Error(`Command timed out after ${timeoutMs}ms`));
            }
          }, timeoutMs);

          // Store pending command
          pendingCommandsRef.current.set(commandId, { resolve, reject, timeoutId });

          // Send command with tracking ID
          const msg: ClientMessage = {
            type: 'command',
            sessionId,
            command,
            commandId
          };
          ws.send(JSON.stringify(msg));

          console.log(`[XTerminal] Sent tracked command ${commandId}: ${command}`);
        });
      },
    };

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
      // Notify parent that terminal is ready
      onReadyRef.current?.(handle);
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);

        if (msg.type === 'output' && msg.data) {
          term.write(msg.data);
        } else if (msg.type === 'exit') {
          onExitRef.current?.(msg.exitCode ?? 0);
        } else if (msg.type === 'command-complete' && msg.commandId) {
          // Resolve pending command promise
          const pending = pendingCommandsRef.current.get(msg.commandId);
          if (pending) {
            clearTimeout(pending.timeoutId);
            pendingCommandsRef.current.delete(msg.commandId);
            pending.resolve({ exitCode: msg.exitCode ?? 0 });
            console.log(`[XTerminal] Command ${msg.commandId} completed with exit code ${msg.exitCode}`);
          }
        }
      } catch (err) {
        console.error('[XTerminal] Error parsing message:', err);
      }
    };

    ws.onclose = () => {
      onStatusChangeRef.current?.('disconnected');
      // Reject all pending commands on disconnect
      for (const [commandId, pending] of pendingCommandsRef.current) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error('WebSocket disconnected'));
        console.warn(`[XTerminal] Command ${commandId} rejected due to disconnect`);
      }
      pendingCommandsRef.current.clear();
    };

    ws.onerror = (err) => {
      console.error('[XTerminal] WebSocket error:', err);
    };

    // Forward terminal input to WebSocket
    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        // Local echo since we don't have PTY
        if (data === '\r') {
          // Enter key - show newline locally and send \n to shell
          term.write('\r\n');
          const msg: ClientMessage = { type: 'input', sessionId, data: '\n' };
          ws.send(JSON.stringify(msg));
        } else if (data === '\x7f') {
          // Backspace - handle locally
          term.write('\b \b');
          const msg: ClientMessage = { type: 'input', sessionId, data };
          ws.send(JSON.stringify(msg));
        } else {
          // Echo character locally and send to shell
          term.write(data);
          const msg: ClientMessage = { type: 'input', sessionId, data };
          ws.send(JSON.stringify(msg));
        }
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
      // Clean up pending commands
      for (const [, pending] of pendingCommandsRef.current) {
        clearTimeout(pending.timeoutId);
      }
      pendingCommandsRef.current.clear();

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
