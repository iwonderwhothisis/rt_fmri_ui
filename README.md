# Neuro-Orch

A full-stack web application for managing real-time fMRI (functional magnetic resonance imaging) neurofeedback sessions.
Built for the CBRAIN rt-fMRI Control System and SMART-Kids research project.

## Features

- **Real-time fMRI Processing**: Integration with MURFI (Multi-Use Real-Time Functional Imaging)
- **Task Presentation**: PsychoPy integration for neurofeedback task delivery
- **Participant Management**: Track and manage participants for neurofeedback studies
- **Workflow Orchestration**: Drag-and-drop interface for multi-step imaging pipelines
- **Session Tracking**: Comprehensive session tracking and analytics
- **Terminal Integration**: Web-based terminal emulator for command execution
- **Real-time Monitoring**: Live session status and progress tracking

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (v9 or higher) or **yarn** or **pnpm**

## Installation

1. **Clone**
   ```bash
   git clone <repository-url>
   cd neuro-orch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

   This will install all frontend and backend dependencies defined in `package.json`.

3. **Verify installation**
   ```bash
   npm run lint
  ```


## Development

### Starting the Development Server

The project uses a monorepo structure with both frontend and backend running concurrently:

```bash
npm run dev
```

This command will:
- Start the **frontend** (Vite dev server) on `http://localhost:8080`
- Start the **backend** (Express server) on `http://localhost:3001`
- Enable hot module replacement for both frontend and backend

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend in development mode |
| `npm run dev:frontend` | Start only the frontend dev server (port 8080) |
| `npm run dev:backend` | Start only the backend server (port 3001) |
| `npm run build` | Build the application for production |
| `npm run build:dev` | Build the application in development mode |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint to check for code quality issues |

### Development URLs

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **WebSocket**: ws://localhost:3001/ws
- **Health Check**: http://localhost:3001/health

## Project Structure

```
neuro-orch/
├── config/                 # Configuration files
├── docs/                   # Documentation
├── public/                 # Static assets
├── scripts/                # Utility scripts
├── server/                 # Backend server code
│   ├── index.ts           # Express server entry point
│   ├── commandService.ts  # Command execution service
│   └── terminalManager.ts # Terminal session management
├── src/                    # Frontend source code
│   ├── components/        # React components
│   │   └── ui/            # shadcn/ui components
│   ├── contexts/          # React contexts
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── pages/             # Page components
│   ├── services/          # API services
│   └── types/             # TypeScript type definitions
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── vite.config.ts         # Vite configuration
└── tailwind.config.ts     # Tailwind CSS configuration
```

## Configuration

### Command Configuration

The application uses YAML configuration files to define commands that can be executed:

- **Development**: `config/commands.yaml`
- **Production**: `config/commands_production.yaml`

These files define:
- Terminal sessions (murfi, psychopy)
- Step commands for workflow execution
- Button commands for UI interactions

### Environment Variables

Currently, the application uses default ports:
- Frontend: `8080`
- Backend: `3001`

To change these, modify:
- `vite.config.ts` (frontend port)
- `server/index.ts` (backend port)

## Technology Stack

### Frontend
- **React 18.3** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 5.4** - Build tool and dev server
- **React Router 6.30** - Client-side routing
- **TanStack React Query 5.83** - Data fetching
- **xterm.js 5.5** - Terminal emulation
- **Radix UI + shadcn/ui** - Component library
- **Tailwind CSS 3.4** - Styling
- **dnd-kit 6.1** - Drag-and-drop functionality

### Backend
- **Node.js** - Runtime environment
- **Express 4.21** - HTTP server
- **TypeScript 5.8** - Type safety
- **ws 8.18** - WebSocket support
- **tsx 4.19** - TypeScript execution
- **node-pty 1.0** - Terminal emulation

## Usage

### Starting a Session

1. Navigate to the **Run Scan** page
2. Select or enter a participant ID
3. Configure PsychoPy settings
4. Click **Start Session**
5. Drag workflow steps into the execution queue
6. Click **Run Next** to execute each step manually
7. Monitor progress in the step history

### Terminal Sessions

The application manages two separate terminal sessions:
- **murfi**: For MURFI-related commands
- **psychopy**: For PsychoPy-related commands