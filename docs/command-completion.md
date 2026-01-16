# Command Completion Detection

This document explains how neuro-orch tracks when terminal commands finish executing and determines their success or failure.

## Overview

When running workflow steps (e.g., `2vol`, `resting_state`, `feedback`), the system needs to know when each command completes before marking the step as done. This is achieved through an **exit code marker** system that wraps commands and parses their output.

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐      stdin/stdout      ┌─────────┐
│   Browser   │ ◄───────────────► │   Server    │ ◄──────────────────► │  Shell  │
│  (XTerminal)│                   │  (Node.js)  │                       │ (zsh)   │
└─────────────┘                   └─────────────┘                       └─────────┘
       │                                 │                                   │
       │  1. Send command + commandId    │                                   │
       │ ──────────────────────────────► │                                   │
       │                                 │  2. Wrap command with marker      │
       │                                 │ ─────────────────────────────────►│
       │                                 │                                   │
       │                                 │  3. Command executes...           │
       │                                 │                                   │
       │                                 │  4. Output + marker received      │
       │                                 │ ◄─────────────────────────────────│
       │                                 │                                   │
       │  5. command-complete message    │                                   │
       │ ◄────────────────────────────── │                                   │
       │                                 │                                   │
       │  6. Resolve promise             │                                   │
       ▼                                 ▼                                   ▼
```

## How It Works

### 1. Command Submission

When a step executes, the frontend calls `executeCommand()` on the terminal handle:

```typescript
// In XTerminal.tsx
const result = await terminalHandle.executeCommand(command, timeoutMs);
```

This generates a unique `commandId` (UUID) and sends it to the server:

```typescript
{
  type: 'command',
  sessionId: 'murfi',
  command: 'echo "Running 2vol calibration..."',
  commandId: 'a1b2c3d4-e5f6-...'
}
```

### 2. Command Wrapping

The server wraps the command with a completion marker:

```typescript
// In terminalManager.ts
const wrappedCommand = `${command}; echo "__NEURO_ORCH_CMD_DONE__${commandId}:$?"`;
```

For example:
```bash
# Original command
echo "Running 2vol calibration..."

# Wrapped command
echo "Running 2vol calibration..."; echo "__NEURO_ORCH_CMD_DONE__a1b2c3d4-e5f6-...:$?"
```

The `$?` captures the exit code of the original command.

### 3. Marker Detection

The server monitors terminal output for the marker pattern:

```typescript
// Regex pattern
/__NEURO_ORCH_CMD_DONE__([a-f0-9-]+):(\d+)/g
```

When detected:
- Extract the `commandId` (group 1)
- Extract the `exitCode` (group 2)
- Send completion message to client

### 4. Output Filtering

The marker lines are **filtered out** before being sent to the browser, so users never see them:

```typescript
// In terminalManager.ts
private filterMarkers(output: string): string {
  return output
    .split('\n')
    .filter(line => !line.includes(COMMAND_MARKER_PREFIX))
    .join('\n');
}
```

### 5. Promise Resolution

The client receives the `command-complete` message and resolves the pending promise:

```typescript
// In XTerminal.tsx
if (msg.type === 'command-complete' && msg.commandId) {
  const pending = pendingCommandsRef.current.get(msg.commandId);
  if (pending) {
    pending.resolve({ exitCode: msg.exitCode ?? 0 });
  }
}
```

## Message Types

### Client → Server

| Type | Fields | Description |
|------|--------|-------------|
| `command` | `sessionId`, `command`, `commandId?` | Execute a command. If `commandId` is provided, track completion. |
| `input` | `sessionId`, `data` | Raw keyboard input |
| `resize` | `sessionId`, `cols`, `rows` | Terminal resize |
| `ping` | `sessionId` | Keep-alive |

### Server → Client

| Type | Fields | Description |
|------|--------|-------------|
| `output` | `sessionId`, `data` | Terminal output (markers filtered) |
| `command-complete` | `sessionId`, `commandId`, `exitCode` | Command finished |
| `exit` | `sessionId`, `exitCode` | Shell exited |
| `error` | `sessionId`, `error` | Error message |
| `pong` | `sessionId` | Keep-alive response |

## Exit Code Handling

| Exit Code | Meaning | Result |
|-----------|---------|--------|
| `0` | Success | Step marked as completed |
| Non-zero | Failure | Step marked as failed with error message |

Example:
```typescript
const result = await executeCommandAndWait(terminal, command);
if (result.exitCode !== 0) {
  throw new Error(`Command failed with exit code ${result.exitCode}`);
}
```

## Timeout Handling

Commands have a default timeout of **5 minutes**. If a command doesn't complete within this time:

```typescript
// Timeout is configurable
const result = await terminalHandle.executeCommand(command, 10 * 60 * 1000); // 10 minutes
```

On timeout:
- The pending promise is rejected with a timeout error
- The step is marked as failed
- The command may still be running in the shell

## File Structure

| File | Role |
|------|------|
| `src/types/terminal.ts` | Message type definitions |
| `server/terminalManager.ts` | Command wrapping, marker parsing |
| `server/index.ts` | WebSocket handling, message routing |
| `src/components/XTerminal.tsx` | Promise-based `executeCommand()` |
| `src/pages/RunScan.tsx` | Step execution using completion detection |

## Comparison: Before vs After

### Before (Simulated)
```typescript
// Fake 2-second delay, no real tracking
const completedStep = await sessionService.completeStep(step);
```

### After (Real Detection)
```typescript
// Actually waits for command to finish
const result = await executeCommandAndWait(terminal, command);
if (result.exitCode !== 0) {
  throw new Error(`Command failed with exit code ${result.exitCode}`);
}
```

## Debugging

### Enable Logging

Both server and client log command execution:

```
[TerminalManager] Executing tracked command a1b2c3d4...: echo "Running..."
[TerminalManager] Command a1b2c3d4... completed with exit code 0
[XTerminal] Command a1b2c3d4... completed with exit code 0
```

### Common Issues

1. **Command never completes**: Check if the shell is waiting for input or if the marker was somehow suppressed.

2. **Marker visible in output**: The filter should remove it. Check for unusual line endings or output buffering.

3. **Wrong exit code**: The `$?` must immediately follow the command. Ensure no other commands run between.

## Limitations

1. **No cancellation**: Once a command starts, there's no way to cancel it and get a completion signal. The stop button marks the step as failed but the command may continue running.

2. **Shell-specific**: The marker approach relies on Bash/Zsh syntax (`$?` for exit code). Other shells may need adjustments.

3. **Output buffering**: If the shell buffers output, the marker might arrive in a separate chunk from the main output. The server handles this with an output buffer.

4. **Nested commands**: Complex command chains (pipes, subshells) work correctly because `$?` always captures the final exit status.
