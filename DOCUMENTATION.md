# Neuro-Orch — CBRAIN rt-fMRI Control System

Comprehensive documentation for the Neuro-Orch platform, a full-stack web application for managing real-time fMRI neurofeedback sessions as part of the SMART-Kids research project at LMU.

---

## Table of Contents

1. [Introduction & Overview](#introduction--overview)
2. [Prerequisites](#prerequisites)
3. [Cloning & Installation](#cloning--installation)
4. [Running the Application](#running-the-application)
5. [Application Walkthrough](#application-walkthrough)
6. [Configuration](#configuration)
7. [Architecture Overview](#architecture-overview)
8. [Troubleshooting](#troubleshooting)

---

## Introduction & Overview

**Neuro-Orch** is a browser-based orchestration tool for real-time fMRI (rt-fMRI) neurofeedback sessions. It provides a guided workflow for operators to initialize scanning systems, configure participant sessions, and execute multi-step fMRI protocols — all through a single web interface with embedded terminal emulators.

### Key Features

- **Guided 3-step workflow** — Initialize systems, configure a session, then execute scan steps in order.
- **Embedded terminals** — Two browser-based terminal sessions (Murfi and PsychoPy) connected to real PTY processes via WebSocket.
- **Drag-and-drop execution queue** — Reorder workflow steps before running them.
- **Command completion tracking** — Each command is tracked with a unique ID; the UI knows when a step succeeds or fails.
- **YAML-driven command configuration** — Swap between development (echo) and production (real script) configs without code changes.
- **Session persistence** — Browser sessionStorage preserves state across accidental page refreshes.
- **Session history** — Completed sessions are recorded and can be reviewed on a detail page.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | v18 or later |
| npm | v9 or later |
| OS | macOS, Linux, or Windows via WSL |

> **Note:** The backend uses `node-pty`, which requires native compilation. On most systems `npm install` handles this automatically, but you may need platform-specific build tools (Xcode Command Line Tools on macOS, `build-essential` on Debian/Ubuntu).

---

## Cloning & Installation

### Clone the repository

```bash
# SSH
git clone git@github.com:iwonderwhothisis/rt_fmri_ui.git

# HTTPS
git clone https://github.com/iwonderwhothisis/rt_fmri_ui.git
```

### Install dependencies

```bash
cd rt_fmri_ui
npm install
```

### Verify the setup

```bash
npm run lint
```

A clean run with no errors confirms the project is set up correctly.

---

## Running the Application

### Quick start (recommended)

The included launch script installs dependencies if needed, starts both servers, and opens the browser automatically:

```bash
./scripts/start.sh
```

To use production commands instead of development echo stubs:

```bash
COMMANDS_CONFIG=commands_production.yaml ./scripts/start.sh
```

### c-Brain Lab Laptop

On the c-Brain lab laptop a shell alias is already configured. Open a terminal and type:

```bash
nfb
```

This launches the application with the production configuration (`commands_production.yaml`), equivalent to running `COMMANDS_CONFIG=commands_production.yaml ./scripts/start.sh`.

### Manual start

```bash
npm run dev
```

This runs the frontend and backend concurrently with color-coded output.

### Available npm scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `npm run dev` | Start frontend + backend concurrently |
| `dev:frontend` | `npm run dev:frontend` | Vite dev server only (port 8080) |
| `dev:backend` | `npm run dev:backend` | Express/WebSocket server only (port 3001, hot-reload via tsx) |
| `build` | `npm run build` | Production build of the frontend |
| `build:dev` | `npm run build:dev` | Development-mode build |
| `lint` | `npm run lint` | Run ESLint |
| `preview` | `npm run preview` | Preview the production build locally |

### Development URLs

| Service | URL |
|---|---|
| Frontend | `http://localhost:8080` |
| Backend API | `http://localhost:3001` |
| Health check | `http://localhost:3001/health` |
| WebSocket | `ws://localhost:3001/ws?sessionId=<id>` |

The Vite dev server proxies `/api`, `/health`, and `/ws` to the backend, so you only need to open port 8080 during development.

---

## Application Walkthrough

The application follows a guided 3-step workflow: **Initialize → Configure → Execute**.

### Landing / Run Scan Page (`/`)

<!-- Screenshot: Landing page — the Run Scan view with the 3-step workflow stepper -->

![Landing page — the Run Scan view with the 3-step workflow stepper](docs/Screenshots/Screenshot%20from%202026-02-03%2010-21-51.png)

This is the main page. The top of the page shows a stepper indicating progress through the three phases.

#### Step 1 — Initialize

<!-- Screenshot: Initialize step — Start Murfi / Start PsychoPy buttons -->
![](docs/Screenshots/Screenshot%20from%202026-02-03%2010-22-31.png)

Two buttons launch the Murfi and PsychoPy terminal sessions. Each button opens a WebSocket-backed PTY terminal in the browser. Both systems must be started before proceeding.

#### Step 2 — Configure

<!-- Screenshot: Participant selection and session configuration form -->
![](docs/Screenshots/Screenshot%20from%202026-02-03%2010-24-14.png)


The operator enters:
- **Participant ID** (e.g. `0001`)
- **Participant anchor** (free text)


Two setup commands run in sequence:

1. **Create Participant** — runs `createxml.sh` (or its echo stub in dev)
2. **Setup Session** — runs `feedback.sh setup`

Once the Setup session has been ran the Start session and continue button can be pressed

#### Step 3 — Execute

<!-- Screenshot: Execution queue with drag-and-drop step cards -->

![](docs/Screenshots/Screenshot%20from%202026-02-03%2010-24-51.png)

![](docs/Screenshots/Screenshot%20from%202026-02-03%2010-37-35.png)


Available workflow steps can be dragged into an execution queue and reordered. Steps include:

| Step | Description |
|---|---|
| 2 Volume Calibration | Calibrate with 2 volumes |
| Resting State | Resting-state scan |
| Extract RS Networks | Extract resting-state networks |
| Process ROI Masks | Process region-of-interest masks |
| Registration | Anatomical registration |
| Feedback (Yes/No × 15/30 min) | Four feedback condition variants |
| Cleanup | Post-session cleanup |

Clicking "run next" will run the next step in the queue. 
Reset will take you back to the landing page 


UI elements will appear in new windows on top of the web app, use as before in the previous implementation then close when done 
![](docs/Screenshots/Screenshot%20from%202026-02-03%2010-27-14.png)

Once all steps have been completed, click finish to proceed to the session detail page 

In the event of an error the terminal outputs will provide the details for debugging.  

### Session Detail Page 

<!-- Screenshot: Session detail view showing completed session summary -->

![](docs/Screenshots/Screenshot%20from%202026-02-03%2010-47-50.png)

After finishing a session, its full history (steps executed, timestamps, outcomes) can be reviewed on this page.

---

## Configuration

### Command configuration files

Commands are defined in YAML files under `config/`:

| File | Purpose |
|---|---|
| `config/commands.yaml` | **Development** — uses `echo` statements for safe local testing |
| `config/commands_production.yaml` | **Production** — real shell scripts for actual fMRI sessions |

Select which file to use via the `COMMANDS_CONFIG` environment variable:

```bash
COMMANDS_CONFIG=commands_production.yaml npm run dev
```

### YAML structure

Each config file has four top-level sections:

```yaml
systems:       # Terminal startup commands (murfi, psychopy)
steps:         # Workflow step commands
buttons:       # Miscellaneous button commands
defaults:      # Fallback behavior for unconfigured buttons
```

### Variable substitution

Commands support `${variable}` placeholders that are replaced at runtime:

| Variable | Example Value | Description |
|---|---|---|
| `${participantId}` | `remind0001` | Participant identifier |
| `${sessionDate}` | `2026-01-31` | Session date (YYYY-MM-DD) |
| `${protocol}` | `DMN-NFB` | Protocol name |
| `${runNumber}` | `1` | Auto-incremented feedback run number |
| `${displayFeedback}` | `Feedback` / `No Feedback` | Feedback display label |
| `${participantAnchor}` | (free text) | Participant anchor value |
| `${feedbackCondition}` | `15min` / `30min` | Feedback duration |

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `COMMANDS_CONFIG` | `commands.yaml` | Command config file name (in `config/`) |
| `TERMINAL_HOST` | `127.0.0.1` | Host the backend binds to |
| `TERMINAL_AUTH_TOKEN` | *(none)* | Optional auth token for WebSocket connections |
| `ALLOW_QUERY_COMMANDS` | `false` | Allow commands via query parameters |
| `ALLOWED_SESSIONS` | *(none)* | Comma-separated list of allowed session IDs |

### Adding and Modifying Workflow Steps

#### Step schema reference

Each entry under `steps:` in a commands YAML file supports the following fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Display label shown in the UI |
| `terminal` | string | yes | Which terminal runs the command: `"murfi"` or `"psychopy"` |
| `command` | string | yes | Bash command to execute. Supports `${variable}` substitution |
| `murfi_command` | string | no | Additional command sent to the murfi terminal in parallel. Used for feedback steps that need both terminals |

#### Adding a new step

1. Open the relevant YAML config file (`config/commands.yaml` or `config/commands_production.yaml`).
2. Add a new entry under `steps:` with a unique key:

```yaml
steps:
  my_new_step:
    name: "My New Step"
    terminal: "murfi"
    command: "echo 'Running step for ${participantId}'"
```

The key (`my_new_step`) must be unique across all steps. In addition to the YAML change, you must update three frontend files:

- **`src/types/session.ts`** — Add the new key to the `SessionStep` union type.
- **`src/pages/RunScan.tsx`** — Add an entry to the `sessionSteps` array.
- **`src/components/SessionControls.tsx`** — Add the step to the appropriate category in `stepCategories`.

Restart the backend after editing the YAML config.

#### Dual-terminal steps

Some steps need to run commands on both terminals simultaneously. Use `murfi_command` to send a secondary command to the murfi terminal while the primary `command` runs on the terminal specified by `terminal`:

```yaml
feedback_yes_15:
  name: "Feedback (15 min)"
  terminal: "psychopy"
  command: "python rt-network_feedback.py '${participantId}' '${runNumber}' '${displayFeedback}' '${feedbackCondition}' '${participantAnchor}'"
  murfi_command: "export MURFI_SUBJECT_NAME=${participantId} && export MURFI_SUBJECTS_DIR=$(dirname $(pwd))/subjects/ && source feedback.sh ${participantId} feedback"
```

Here the PsychoPy terminal runs the feedback display script while the murfi terminal starts the real-time fMRI processing in parallel.

#### Changing an existing step's command

Edit the `command` (or `murfi_command`) value in the YAML file and restart the backend. Make the change in both `commands.yaml` and `commands_production.yaml` to keep them in sync.

#### Removing a step

Delete the entire key block from the YAML file and restart the backend.

#### Tip: dev vs production

- `config/commands.yaml` — development config, typically uses safe `echo` commands for testing.
- `config/commands_production.yaml` — production config, runs real scripts.

Both files should stay structurally in sync so switching between them doesn't cause missing-step errors.

See `docs/button-commands.md` for a detailed guide on button and command configuration.

---

## Architecture Overview

### Tech stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript 5.8 |
| Build tool | Vite 5.4 (SWC plugin) |
| Routing | React Router 6 |
| Data fetching | TanStack React Query |
| Component library | Radix UI + shadcn/ui |
| Styling | Tailwind CSS 3.4 |
| Terminal emulation | xterm.js 5.5 |
| Drag-and-drop | dnd-kit |
| Icons | Lucide React |
| Backend | Express 4 + TypeScript |
| WebSocket | ws 8 |
| PTY | node-pty 1.0 |
| Config parsing | yaml 2.8 |

### Project structure

```
rt_fmri_ui/
├── config/                    # YAML command configurations
│   ├── commands.yaml
│   └── commands_production.yaml
├── data/                      # Runtime data (participants.csv)
├── docs/                      # Additional documentation
├── scripts/                   # Shell scripts and PsychoPy task
├── server/                    # Backend
│   ├── index.ts               # Express + WebSocket entry point
│   ├── commandService.ts      # YAML config loader
│   └── terminalManager.ts     # PTY session management
├── src/                       # Frontend
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui primitives
│   │   ├── XTerminal.tsx      # Terminal emulator component
│   │   ├── ExecutionQueue.tsx  # Drag-and-drop queue
│   │   ├── WorkflowStepper.tsx# 3-step guided workflow
│   │   ├── StepPipeline.tsx   # Step progress visualization
│   │   ├── StepHistory.tsx    # Execution log
│   │   └── ...
│   ├── contexts/
│   │   └── TerminalCommandContext.tsx  # Command execution context
│   ├── hooks/                 # Custom React hooks
│   ├── pages/
│   │   ├── RunScan.tsx        # Main workflow page
│   │   └── SessionDetail.tsx  # Session review page
│   ├── services/              # API / data services
│   └── types/                 # TypeScript type definitions
├── index.html                 # HTML shell
├── vite.config.ts             # Vite configuration (proxy, aliases)
├── package.json
└── tsconfig.json
```

### Key architectural patterns

**WebSocket terminals** — The frontend `XTerminal` component opens a WebSocket to the backend. The backend spawns a PTY shell via `node-pty` and bridges I/O over the socket. Two named sessions (`murfi`, `psychopy`) run independently.

**Command completion detection** — Each command is wrapped with an exit-code marker (`__NEURO_ORCH_CMD_DONE__<exitCode>`) on the server side. The server watches PTY output for this marker, strips it, and sends a `command-complete` message back to the client with the exit code. See `docs/command-completion.md` for details.

**React Context for command execution** — `TerminalCommandContext` loads the YAML config from the API, manages terminal registrations, performs variable substitution, and provides `executeTrackedCommand()` which returns a Promise that resolves with the command's exit code.

**Session persistence** — The `useSessionPersistence` hook serializes workflow state to `sessionStorage` so an accidental page refresh does not lose progress.

---

## Troubleshooting

### Port conflicts

If port 8080 or 3001 is already in use, the server will fail to start. Kill the conflicting process or change the port in `vite.config.ts` (frontend) and `server/index.ts` (backend).

```bash
# Find what's using a port
lsof -i :8080
lsof -i :3001
```

### node-pty build failures

`node-pty` compiles native code during `npm install`. Common fixes:

- **macOS:** Install Xcode Command Line Tools — `xcode-select --install`
- **Linux:** Install build essentials — `sudo apt install build-essential python3`
- **Node version mismatch:** Rebuild native modules — `npm rebuild node-pty`

### WebSocket connection issues

- Confirm the backend is running (`curl http://localhost:3001/health`).
- Check that the Vite proxy config in `vite.config.ts` points to the correct backend port.
- If using `TERMINAL_AUTH_TOKEN`, ensure the frontend passes the same token as a query parameter.

### Terminal not responding

- The terminal may have timed out. Refresh the page to reconnect.
- Check the backend console for PTY errors.
- Ensure the shell specified by the user's environment (`$SHELL`) is available.

### Commands not appearing in the UI

- Verify the YAML config file is valid (`node -e "const y=require('yaml'); console.log(y.parse(require('fs').readFileSync('config/commands.yaml','utf8')))"`)
- Check the `COMMANDS_CONFIG` environment variable points to the correct file.
- Restart the backend after changing config files.
