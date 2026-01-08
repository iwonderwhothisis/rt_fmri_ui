# Button Terminal Commands - Configuration Guide

## Overview

Every button in the application can execute a terminal command when clicked. Commands are configured in `config/commands.yaml` and run **in addition to** the button's normal behavior.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  config/commands.yaml                                           │
│  - Define button commands                                       │
│  - Set default behavior                                         │
│  - Configure target terminal (murfi/psychopy)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ loaded by
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  TerminalCommandContext (src/contexts/TerminalCommandContext)   │
│  - Fetches config from /api/config/commands                     │
│  - Manages terminal registrations                               │
│  - Executes commands with variable substitution                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ used by
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  useButtonCommand Hook (src/hooks/useButtonCommand.ts)          │
│  - Simple API for components                                    │
│  - Returns { execute, withCommand }                             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ called by
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  Button Components                                              │
│  - Call execute() or withCommand() on click                     │
│  - Pass variables like { participantId: '001' }                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Configuration File Structure

**File:** `config/commands.yaml`

```yaml
# Default behavior for buttons WITHOUT explicit config
defaults:
  button:
    terminal: murfi                           # Default terminal
    command: "echo 'Button ${buttonId} pressed'"  # Default command

# Button-specific configurations
buttons:
  # Format: componentName.actionName
  initialize.startMurfi:
    terminal: murfi                           # Single terminal
    command: "echo 'Starting Murfi...'"

  session.stop:
    terminals:                                # Multiple terminals
      - murfi
      - psychopy
    command: "echo 'STOP signal sent'"

  participant.create:
    terminal: murfi
    command: "echo 'Creating participant: ${participantId}'"  # With variable
```

### Configuration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `terminal` | `'murfi'` \| `'psychopy'` | No | Single target terminal |
| `terminals` | `Array<'murfi' \| 'psychopy'>` | No | Multiple target terminals |
| `command` | `string` | No | Bash command to execute |

**Note:** If neither `terminal` nor `terminals` is specified, uses default (`murfi`).

---

## Variable Substitution

Commands support `${variableName}` syntax for dynamic values:

| Variable | Description | Example |
|----------|-------------|---------|
| `${buttonId}` | Auto-injected button ID | `initialize.startMurfi` |
| `${participantId}` | Participant ID | `001` |
| `${sessionId}` | Session ID | `S001-abc123` |
| `${stepName}` | Step name | `Resting State` |

**Example:**
```yaml
participant.create:
  command: "echo 'Creating participant: ${participantId}'"
```
Output: `Creating participant: 001`

---

## Step-by-Step Guides

### How to Change an Existing Button's Command

1. Open `config/commands.yaml`
2. Find the button by its ID (e.g., `session.start`)
3. Modify the `command` field:

```yaml
# Before
session.start:
  terminal: murfi
  command: "echo 'Starting session...'"

# After
session.start:
  terminal: murfi
  command: "/path/to/start_session.sh ${participantId}"
```

4. Save the file - changes take effect on next page load (no server restart needed)

---

### How to Add a Command to a New Button

**Step 1:** Choose a button ID following the naming convention:
```
{componentName}.{actionName}
```

**Step 2:** Add configuration to `config/commands.yaml`:
```yaml
buttons:
  # ... existing buttons ...

  myComponent.myAction:
    terminal: murfi
    command: "echo 'My action executed'"
```

**Step 3:** In your React component, use the hook:
```tsx
import { useButtonCommand } from '@/hooks/useButtonCommand';

function MyComponent() {
  const myActionCmd = useButtonCommand('myComponent.myAction');

  const handleClick = () => {
    // Your existing logic
    doSomething();

    // Execute terminal command
    myActionCmd.execute({ participantId: '001' });
  };

  return <Button onClick={handleClick}>My Action</Button>;
}
```

---

### How to Send Command to Multiple Terminals

Use `terminals` (plural) instead of `terminal`:

```yaml
session.stop:
  terminals:
    - murfi
    - psychopy
  command: "echo 'STOP signal received'"
```

This sends the same command to both terminals simultaneously.

---

### How to Run a Real Script Instead of Echo

Replace `echo` with your actual command:

```yaml
# Run a Python script
feedback:
  terminal: psychopy
  command: "python /path/to/feedback_task.py --participant ${participantId}"

# Run a shell script
setup:
  terminal: murfi
  command: "/opt/murfi/scripts/setup_session.sh ${participantId}"

# Run multiple commands
resting_state:
  terminal: murfi
  command: "cd /data && ./start_scan.sh && echo 'Scan started'"
```

---

## Existing Button IDs

| Button ID | Component | Description |
|-----------|-----------|-------------|
| `initialize.startMurfi` | InitializeStep | Start Murfi button |
| `initialize.startPsychoPy` | InitializeStep | Start PsychoPy button |
| `initialize.proceed` | InitializeStep | Proceed button |
| `participant.addNew` | ParticipantSelector | Add New Participant |
| `participant.create` | ParticipantSelector | Create button |
| `participant.cancel` | ParticipantSelector | Cancel button |
| `participant.select` | ParticipantSelector | Dropdown selection |
| `runScan.setup` | RunScan | Run Setup button |
| `runScan.toggleTerminal` | RunScan | Show/Hide terminal |
| `session.start` | SessionControls | Start Session |
| `session.reset` | SessionControls | Reset button |
| `session.startQueue` | SessionControls | Start Queue |
| `session.resume` | SessionControls | Resume button |
| `session.stop` | SessionControls | Stop button |
| `session.clear` | SessionControls | Clear Queue |
| `session.finish` | SessionControls | Finish button |
| `queue.remove` | ExecutionQueue | Remove item (X) |
| `stepPipeline.toggleHistory` | StepPipeline | Toggle execution history |
| `workflow.stepClick` | WorkflowStepper | Click workflow step |
| `nav.runScan` | Navigation | Run Scan nav link |
| `nav.previousScans` | Navigation | Previous Scans nav link |
| `nav.help` | Navigation | Help button |
| `sessionCard.click` | SessionCard | Click session card |
| `sessionCard.viewDetails` | SessionCard | View Details button |
| `sessionCard.select` | SessionCard | Session checkbox |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `config/commands.yaml` | **Edit this** to configure commands |
| `src/contexts/TerminalCommandContext.tsx` | Context provider (manages execution) |
| `src/hooks/useButtonCommand.ts` | Hook for components |
| `src/types/commands.ts` | TypeScript interfaces |

---

## Troubleshooting

### Commands not appearing in terminal
1. Check browser console for `[TerminalCommand]` logs
2. If you see "Terminal not ready" - the terminal isn't connected yet
3. Ensure terminals are started (green status) before clicking buttons

### Command executes but nothing happens
1. Check the command syntax in YAML
2. Test the command manually in a terminal
3. Check for typos in variable names (`${participantId}` not `${participantID}`)

### Changes not taking effect
- YAML changes load on page refresh (no server restart needed)
- Check for YAML syntax errors (proper indentation, quotes around strings with special chars)
