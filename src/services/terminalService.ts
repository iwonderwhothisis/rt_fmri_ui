type TerminalType = 'murfi' | 'psychopy';

type MessageType = 'connected' | 'output' | 'exit' | 'error';

interface TerminalMessage {
  type: MessageType;
  data?: string;
  terminalType?: TerminalType;
  message?: string;
  code?: number;
  signal?: number;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export class TerminalService {
  private ws: WebSocket | null = null;
  private terminalType: TerminalType;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private outputHandlers: Set<(data: string) => void> = new Set();
  private stateHandlers: Set<(state: ConnectionState) => void> = new Set();

  constructor(terminalType: TerminalType) {
    this.terminalType = terminalType;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
        resolve();
        return;
      }

      this.setConnectionState('connecting');
      const wsUrl = `ws://localhost:3001?terminal=${this.terminalType}`;

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.setConnectionState('connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: TerminalMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.setConnectionState('error');
          reject(error);
        };

        this.ws.onclose = () => {
          this.setConnectionState('disconnected');
          this.ws = null;
          this.attemptReconnect();
        };
      } catch (error) {
        this.setConnectionState('error');
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setConnectionState('disconnected');
    this.reconnectAttempts = 0;
  }

  sendCommand(command: string) {
    if (this.ws && this.connectionState === 'connected') {
      this.ws.send(JSON.stringify({
        type: 'command',
        command,
      }));
    } else {
      console.warn('Cannot send command: WebSocket not connected');
    }
  }

  onOutput(handler: (data: string) => void) {
    this.outputHandlers.add(handler);
    return () => {
      this.outputHandlers.delete(handler);
    };
  }

  onStateChange(handler: (state: ConnectionState) => void) {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private handleMessage(message: TerminalMessage) {
    switch (message.type) {
      case 'connected':
        this.setConnectionState('connected');
        if (message.message) {
          this.notifyOutput(message.message + '\n');
        }
        break;

      case 'output':
        if (message.data) {
          this.notifyOutput(message.data);
        }
        break;

      case 'exit':
        this.setConnectionState('disconnected');
        if (message.code !== undefined) {
          this.notifyOutput(`\nProcess exited with code ${message.code}\n`);
        }
        break;

      case 'error':
        this.setConnectionState('error');
        if (message.message) {
          this.notifyOutput(`Error: ${message.message}\n`);
        }
        break;
    }
  }

  private notifyOutput(data: string) {
    this.outputHandlers.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in output handler:', error);
      }
    });
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.stateHandlers.forEach((handler) => {
        try {
          handler(state);
        } catch (error) {
          console.error('Error in state change handler:', error);
        }
      });
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.setConnectionState('error');
      return;
    }

    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000); // Exponential backoff, max 30s

    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect().catch((error) => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay);
  }
}
