# rt-fMRI Neurofeedback Control System - Architecture

## Overview

This is a React-based GUI for orchestrating real-time fMRI neurofeedback sessions. It provides a unified interface for controlling Murfi (rt-fMRI processing) and PsychoPy (task presentation) systems.

## Technology Stack

### Frontend (This Application)
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling with a neuroscience-inspired design system
- **shadcn/ui** for accessible UI components
- **React Query** for data fetching and state management
- **React Router** for navigation

### Backend Integration (To Be Implemented)
The frontend expects a REST API backend with the following endpoints:

```typescript
// Participant Management
GET    /api/participants              // List all participants
POST   /api/participants              // Create new participant
GET    /api/participants/:id          // Get participant details

// Session Management
POST   /api/sessions                  // Create new session
GET    /api/sessions                  // List previous sessions
GET    /api/sessions/:id              // Get session details
POST   /api/sessions/:id/start        // Start session
POST   /api/sessions/:id/stop         // Stop session

// Step Execution
POST   /api/sessions/:id/steps/:step  // Execute specific step
GET    /api/sessions/:id/steps        // Get step history

// System Status
GET    /api/system/status             // Check Murfi/PsychoPy availability
GET    /api/system/health             // Health check
```

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── Navigation.tsx           # Top navigation bar
│   ├── ParticipantSelector.tsx  # Participant selection/creation
│   ├── PsychoPyConfig.tsx       # PsychoPy configuration form
│   ├── SessionControls.tsx      # Start/Reset session controls
│   ├── StepHistory.tsx          # Step execution history table
│   └── BrainScanPreview.tsx     # Preview area for fMRI data
│
├── pages/                # Page components
│   ├── RunScan.tsx              # Main session control page
│   └── PreviousScans.tsx        # Session history viewer
│
├── services/             # API and business logic
│   └── mockSessionService.ts    # Mock API (replace with real API calls)
│
├── types/                # TypeScript interfaces
│   └── session.ts               # Data models
│
└── hooks/                # Custom React hooks
    └── use-toast.ts             # Toast notifications

```

## Data Models

### Participant
```typescript
interface Participant {
  id: string;              // e.g., "P001"
  name: string;            // Full name
  age: number;             // Age in years
  lastSession?: string;    // ISO date string
}
```

### Session
```typescript
interface Session {
  id: string;                      // Unique session ID
  config: SessionConfig;           // Session configuration
  status: 'idle' | 'running' | 'completed' | 'error';
  currentStep?: SessionStep;       // Currently executing step
  stepHistory: SessionStepHistory[]; // Completed steps
  startTime?: string;              // ISO timestamp
  endTime?: string;                // ISO timestamp
}
```

### Session Steps (in order)
1. `create` - Initialize session
2. `setup` - Configure scanner/systems
3. `2vol` - Two-volume alignment
4. `resting_state` - Resting state acquisition
5. `extract_rs_networks` - Extract resting state networks
6. `process_roi_masks` - Process ROI masks
7. `register` - Registration
8. `feedback` - Run neurofeedback task
9. `cleanup` - Clean up and finalize

## Backend Implementation Guide

### Recommended Python Stack
- **FastAPI** - Modern, fast API framework
- **uvicorn** - ASGI server
- **asyncio** - For async subprocess management
- **pydantic** - Data validation
- **WebSockets** (optional) - For real-time updates

### Example Backend Structure

```python
# main.py
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import asyncio

app = FastAPI()

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session orchestration
class SessionManager:
    def __init__(self):
        self.active_sessions = {}
        
    async def execute_step(self, session_id: str, step: str):
        """Execute a session step via subprocess"""
        if step == "create":
            # Call Murfi create script
            process = await asyncio.create_subprocess_exec(
                "/path/to/murfi/scripts/create_session.sh",
                session_id,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            return {"success": process.returncode == 0}
        
        elif step == "feedback":
            # Launch PsychoPy task
            process = await asyncio.create_subprocess_exec(
                "python",
                "/path/to/psychopy/dmn_ball_task.py",
                "--participant", session_id,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            return {"success": process.returncode == 0}
        
        # ... implement other steps

session_manager = SessionManager()

@app.post("/api/sessions/{session_id}/steps/{step}")
async def execute_step(session_id: str, step: str, background_tasks: BackgroundTasks):
    """Execute a session step"""
    background_tasks.add_task(
        session_manager.execute_step, 
        session_id, 
        step
    )
    return {"status": "started", "step": step}

@app.get("/api/system/status")
async def system_status():
    """Check if Murfi and PsychoPy are available"""
    murfi_available = check_murfi_running()
    psychopy_available = check_psychopy_available()
    return {
        "murfi": murfi_available,
        "psychopy": psychopy_available
    }
```

### Connecting Frontend to Backend

1. **Update API base URL** in `src/services/mockSessionService.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8000/api';

export const sessionService = {
  getParticipants: async () => {
    const response = await fetch(`${API_BASE_URL}/participants`);
    return response.json();
  },
  
  startStep: async (sessionId: string, step: SessionStep) => {
    const response = await fetch(
      `${API_BASE_URL}/sessions/${sessionId}/steps/${step}`,
      { method: 'POST' }
    );
    return response.json();
  },
  // ... implement other methods
};
```

2. **Add WebSocket support** (optional, for real-time updates):
```typescript
// In RunScan.tsx
useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/ws/session/${sessionId}');
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    if (update.type === 'step_complete') {
      // Update step history in real-time
      setStepHistory(prev => [...prev, update.data]);
    }
  };
  
  return () => ws.close();
}, [sessionId]);
```

## Crash Detection & Recovery

### Backend Implementation
```python
import psutil
import time

class ProcessMonitor:
    def __init__(self):
        self.murfi_pid = None
        self.psychopy_pid = None
    
    async def monitor_processes(self):
        """Monitor Murfi/PsychoPy processes"""
        while True:
            if self.murfi_pid and not psutil.pid_exists(self.murfi_pid):
                # Murfi crashed - notify frontend
                await notify_frontend_crash("murfi")
                
            if self.psychopy_pid and not psutil.pid_exists(self.psychopy_pid):
                # PsychoPy crashed - notify frontend
                await notify_frontend_crash("psychopy")
            
            await asyncio.sleep(1)
```

### Frontend Handling
The GUI already shows error states in the step history. When backend detects crashes, send status updates via WebSocket or polling.

## Design System

The app uses a dark, professional theme inspired by neuroscience/medical software:

### Color Palette
- **Background**: Dark blue-gray (`hsl(210 30% 8%)`)
- **Primary**: Cyan/teal (`hsl(174 62% 47%)`) - brain activity color
- **Accent**: Bright cyan (`hsl(168 70% 50%)`)
- **Success**: Green (`hsl(142 71% 45%)`)
- **Warning**: Orange (`hsl(38 92% 50%)`)
- **Destructive**: Red (`hsl(0 72% 51%)`)

### Typography
- Clean, readable fonts optimized for scanner control room use
- High contrast for readability under time pressure

## Development Workflow

### Running the Frontend
```bash
npm install
npm run dev
```
Access at http://localhost:8080

### Building for Production
```bash
npm run build
```

### Integration Testing
1. Start your Python backend on port 8000
2. Start React dev server on port 8080
3. CORS should allow communication between them
4. Test each endpoint with real Murfi/PsychoPy scripts

## Future Enhancements

### Planned Features
- [ ] Real-time brain scan visualization (WebGL/Three.js)
- [ ] Session comparison and analytics
- [ ] Automated protocol execution
- [ ] Custom protocol builder
- [ ] Export session reports (PDF)
- [ ] Multi-user support with authentication
- [ ] Scanner time optimization analyzer
- [ ] Automated quality checks

### Technical Debt
- Replace mock service with real API client
- Add comprehensive error boundaries
- Implement retry logic for failed steps
- Add session state persistence
- Implement proper logging

## Deployment

### Docker Deployment (Recommended)
```dockerfile
# Dockerfile
FROM node:18 AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.11
WORKDIR /app

# Install Python backend
COPY backend/requirements.txt .
RUN pip install -r requirements.txt

# Copy frontend build
COPY --from=frontend /app/dist ./static

# Copy backend code
COPY backend/ .

# Start backend (serves both API and static frontend)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables
```bash
# Backend
MURFI_PATH=/path/to/murfi-rt-PyProject
PSYCHOPY_PATH=/path/to/rt-PsychoPy
SESSION_DATA_DIR=/data/sessions
LOG_LEVEL=INFO

# Frontend (build time)
VITE_API_BASE_URL=http://localhost:8000/api
```

## Testing Strategy

### Frontend Tests
- Unit tests for components (Vitest + React Testing Library)
- Integration tests for user flows
- E2E tests with real backend (Playwright)

### Backend Tests
- Unit tests for API endpoints
- Subprocess mocking for Murfi/PsychoPy
- Integration tests with test data

### System Tests
- End-to-end session execution
- Crash recovery scenarios
- Performance under load

## Contributing

When adding new features:
1. Update TypeScript types in `src/types/`
2. Update mock service if needed
3. Keep design system consistent
4. Add proper error handling
5. Update this documentation

## Support

For questions about:
- **GUI/Frontend**: Check React/TypeScript docs
- **Backend Integration**: See FastAPI documentation
- **Murfi**: Refer to murfi-rt-PyProject docs
- **PsychoPy**: Check rt-PsychoPy repository
