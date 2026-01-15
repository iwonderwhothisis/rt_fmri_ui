import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { TerminalManager } from './terminalManager.js';
import { loadCommandsConfig, getSystemCommand } from './commandService.js';

const app = express();
const PORT = 3001;
const HOST = process.env.TERMINAL_HOST || '127.0.0.1';
const AUTH_TOKEN = process.env.TERMINAL_AUTH_TOKEN || '';
const ALLOW_QUERY_COMMANDS = process.env.ALLOW_QUERY_COMMANDS === 'true';

app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const terminalManager = new TerminalManager();

// Map WebSocket connections to their session IDs
const wsSessionMap = new Map<WebSocket, string>();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeSessions: terminalManager.getActiveSessionCount(),
    sessionIds: terminalManager.getSessionIds(),
  });
});

// Commands configuration endpoint
app.get('/api/config/commands', (_req, res) => {
  try {
    const config = loadCommandsConfig();
    res.json(config);
  } catch (error) {
    console.error('[Server] Error loading commands config:', error);
    res.status(500).json({ error: 'Failed to load commands configuration' });
  }
});

const getAllowedSessionIds = () => {
  const config = loadCommandsConfig();
  const systemIds = Object.keys(config.systems || {});
  const envAllowed = (process.env.ALLOWED_SESSIONS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return new Set([...systemIds, ...envAllowed]);
};

const isAuthorized = (token: string | null) => {
  if (!AUTH_TOKEN) return true;
  return token === AUTH_TOKEN;
};

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const sessionId = url.searchParams.get('sessionId');
  const token = url.searchParams.get('token');
  const allowedSessionIds = getAllowedSessionIds();
  if (!sessionId) {
    ws.close(1008, 'Session ID required');
    return;
  }

  if (!isAuthorized(token)) {
    ws.close(1008, 'Unauthorized');
    return;
  }

  if (!allowedSessionIds.has(sessionId)) {
    ws.close(1008, 'Session not allowed');
    return;
  }

  // Get initial command from config, unless explicitly allowed via env
  let initialCommand: string | null = getSystemCommand(sessionId);
  if (initialCommand) {
    console.log(`[Terminal] Using config start command for ${sessionId}`);
  }

  const queryInitialCommand = url.searchParams.get('initialCommand');
  if (ALLOW_QUERY_COMMANDS && queryInitialCommand) {
    initialCommand = queryInitialCommand;
    console.log(`[Terminal] Using query initial command for ${sessionId}`);
  }

  console.log(`[Terminal] New connection for session: ${sessionId}`);
  wsSessionMap.set(ws, sessionId);

  // Create PTY session
  const ptyProcess = terminalManager.createSession(
    sessionId,
    // onData: send PTY output to WebSocket
    (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', sessionId, data }));
      }
    },
    // onExit: notify WebSocket and cleanup
    (exitCode: number) => {
      console.log(`[Terminal] Session ${sessionId} exited with code ${exitCode}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'exit', sessionId, exitCode }));
      }
    },
    initialCommand || undefined
  );

  if (!ptyProcess) {
    console.error(`[Terminal] Failed to create PTY for session: ${sessionId}`);
    ws.send(JSON.stringify({ type: 'error', sessionId, error: 'Failed to create terminal session' }));
    ws.close(1011, 'Failed to create terminal');
    return;
  }

  // Handle incoming messages from WebSocket
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());

      switch (msg.type) {
        case 'input':
          terminalManager.write(sessionId, msg.data);
          break;

        case 'command':
          // Execute a command in the terminal (adds newline for non-TTY shell)
          if (msg.command) {
            console.log(`[Terminal] Executing command in ${sessionId}: ${msg.command}`);
            terminalManager.write(sessionId, msg.command + '\n');
          }
          break;

        case 'resize':
          if (msg.cols && msg.rows) {
            terminalManager.resize(sessionId, msg.cols, msg.rows);
          }
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', sessionId }));
          break;

        default:
          console.log(`[Terminal] Unknown message type: ${msg.type}`);
      }
    } catch (err) {
      console.error('[Terminal] Error parsing message:', err);
    }
  });

  // Handle WebSocket close
  ws.on('close', () => {
    console.log(`[Terminal] Connection closed for session: ${sessionId}`);
    wsSessionMap.delete(ws);
    terminalManager.destroy(sessionId);
  });

  // Handle WebSocket errors
  ws.on('error', (err) => {
    console.error(`[Terminal] WebSocket error for session ${sessionId}:`, err);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Terminal] Shutting down...');
  terminalManager.destroyAll();
  wss.close();
  server.close(() => {
    console.log('[Terminal] Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n[Terminal] Shutting down...');
  terminalManager.destroyAll();
  wss.close();
  server.close(() => {
    console.log('[Terminal] Server closed');
    process.exit(0);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[Terminal] Server running on http://${HOST}:${PORT}`);
  console.log(`[Terminal] WebSocket available at ws://${HOST}:${PORT}`);
});
