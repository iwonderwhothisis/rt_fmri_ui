import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveTerminalProps {
  name: string;
  output: string[];
  onCommand: (command: string) => void;
  isActive?: boolean;
  connectionState?: 'disconnected' | 'connecting' | 'connected' | 'error';
  className?: string;
}

export function InteractiveTerminal({
  name,
  output,
  onCommand,
  isActive = true,
  connectionState,
  className,
}: InteractiveTerminalProps) {
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when output updates
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Focus input when terminal becomes active
  useEffect(() => {
    if (isActive && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isActive]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (command.trim()) {
        // Add to history if not duplicate of last command
        setCommandHistory(prev => {
          const newHistory = prev[prev.length - 1] !== command.trim()
            ? [...prev, command.trim()]
            : prev;
          return newHistory.slice(-50); // Keep last 50 commands
        });
        setHistoryIndex(-1);
        onCommand(command.trim());
        setCommand('');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1
          ? commandHistory.length - 1
          : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCommand(commandHistory[newIndex]);
        }
      }
    }
  };

  const getConnectionStatusBadge = () => {
    if (!connectionState) return null;

    const statusConfig = {
      disconnected: { text: 'Disconnected', color: 'text-muted-foreground' },
      connecting: { text: 'Connecting...', color: 'text-yellow-400' },
      connected: { text: 'Connected', color: 'text-green-400' },
      error: { text: 'Error', color: 'text-red-400' },
    };

    const config = statusConfig[connectionState];
    return (
      <span className={cn('text-xs ml-2', config.color)}>
        ({config.text})
      </span>
    );
  };

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center">
        {name} Terminal:
        {getConnectionStatusBadge()}
      </div>
      <div
        ref={outputRef}
        className="bg-black/90 text-green-400 font-mono text-xs p-3 rounded-lg border border-border/50 overflow-y-auto max-h-48"
        style={{ minHeight: '120px' }}
      >
        {output.length === 0 ? (
          <div className="text-muted-foreground/50">Waiting for output...</div>
        ) : (
          output.map((line, index) => (
            <div key={index} className="mb-1">
              {line.startsWith('$') ? (
                <span className="text-blue-400">{line}</span>
              ) : line.startsWith('✓') ? (
                <span className="text-green-400">{line}</span>
              ) : line.startsWith('✗') || line.toLowerCase().includes('error') ? (
                <span className="text-red-400">{line}</span>
              ) : (
                <span>{line}</span>
              )}
            </div>
          ))
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-green-400 font-mono text-xs">$</span>
        <input
          ref={inputRef}
          type="text"
          value={command}
          onChange={(e) => {
            setCommand(e.target.value);
            setHistoryIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          disabled={!isActive}
          className="flex-1 bg-black/90 text-green-400 font-mono text-xs px-2 py-1 rounded border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder={isActive ? 'Enter command...' : 'Terminal inactive'}
        />
      </div>
    </div>
  );
}
