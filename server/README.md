# Backend Server for Terminal Execution

This backend server enables real command execution in the interactive terminals.

## Setup

1. Install backend dependencies:
```bash
npm run backend:install
```

Or manually:
```bash
cd server
npm install
```

## Running the Server

### Development Mode (with auto-reload):
```bash
npm run dev:backend
```

### Production Mode:
```bash
npm run backend:start
```

### Run Both Frontend and Backend Together:
```bash
npm run dev:all
```

## Server Configuration

- **Port**: 3001 (configurable via `PORT` environment variable)
- **WebSocket**: Enabled on the same port
- **CORS**: Enabled for local development

## API Endpoints

- `GET /health` - Health check endpoint

## WebSocket Connection

Connect to: `ws://localhost:3001?terminal=murfi` or `ws://localhost:3001?terminal=psychopy`

### WebSocket Events

**Client → Server:**
- `command` - Execute a command: `{ type: 'command', command: 'ls -la' }`
- `resize` - Resize terminal: `{ type: 'resize', cols: 80, rows: 24 }`

**Server → Client:**
- `connected` - Connection established
- `output` - Terminal output data
- `exit` - Process exited
- `error` - Error occurred

## Notes

- Each terminal type (Murfi/PsychoPy) gets its own shell session
- Commands are executed in real shell processes
- Output is streamed in real-time via WebSocket
- Since this is local-only, all commands are allowed without restrictions
