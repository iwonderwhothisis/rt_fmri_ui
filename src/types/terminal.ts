export type TerminalStatus = 'disconnected' | 'connecting' | 'connected';

export interface ClientMessage {
  type: 'input' | 'resize' | 'ping' | 'command';
  sessionId: string;
  data?: string;
  cols?: number;
  rows?: number;
  command?: string;
  commandId?: string;  // Unique ID for tracking command completion
}

export interface ServerMessage {
  type: 'output' | 'exit' | 'error' | 'pong' | 'command-complete';
  sessionId: string;
  data?: string;
  exitCode?: number;
  error?: string;
  commandId?: string;  // Matches the command that completed
}
