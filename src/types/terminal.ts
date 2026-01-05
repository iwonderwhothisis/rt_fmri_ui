export type TerminalStatus = 'disconnected' | 'connecting' | 'connected';

export interface ClientMessage {
  type: 'input' | 'resize' | 'ping';
  sessionId: string;
  data?: string;
  cols?: number;
  rows?: number;
}

export interface ServerMessage {
  type: 'output' | 'exit' | 'error' | 'pong';
  sessionId: string;
  data?: string;
  exitCode?: number;
  error?: string;
}
