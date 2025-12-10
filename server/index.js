import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { TerminalSession } from './terminal.js';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store terminal sessions
const terminalSessions = new Map();

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  let terminalType = null;
  let terminalSession = null;

  // Parse terminal type from query string or URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  terminalType = url.searchParams.get('terminal') || 'murfi';

  // Validate terminal type
  if (terminalType !== 'murfi' && terminalType !== 'psychopy') {
    ws.close(1008, 'Invalid terminal type');
    return;
  }

  // Create or get terminal session
  const sessionKey = `${terminalType}-${Date.now()}`;
  terminalSession = new TerminalSession(terminalType);
  terminalSessions.set(sessionKey, terminalSession);

  // Start terminal session
  terminalSession.start();

  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connected',
    terminalType,
    message: `Connected to ${terminalType} terminal`,
  }));

  // Handle terminal output
  terminalSession.on('output', (data) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'output',
        data: data.toString(),
      }));
    }
  });

  // Handle terminal exit
  terminalSession.on('exit', ({ code, signal }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'exit',
        code,
        signal,
      }));
    }
  });

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());

      switch (data.type) {
        case 'command':
          if (terminalSession && terminalSession.isActive) {
            // Write command to terminal (add newline to execute)
            terminalSession.write(data.command + '\n');
          }
          break;

        case 'resize':
          if (terminalSession && terminalSession.isActive) {
            terminalSession.resize(data.cols || 80, data.rows || 24);
          }
          break;

        default:
          console.warn('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to parse message',
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    if (terminalSession) {
      terminalSession.kill();
      terminalSessions.delete(sessionKey);
    }
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    if (terminalSession) {
      terminalSession.kill();
      terminalSessions.delete(sessionKey);
    }
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready for terminal connections`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  terminalSessions.forEach((session) => {
    session.kill();
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  terminalSessions.forEach((session) => {
    session.kill();
  });
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
