import { spawn, ChildProcess } from 'child_process';

// Unique marker that won't appear in normal output
const COMMAND_MARKER_PREFIX = '__NEURO_ORCH_CMD_DONE__';

interface TerminalSession {
  process: ChildProcess;
  createdAt: Date;
  outputBuffer: string;
}

export class TerminalManager {
  private sessions: Map<string, TerminalSession> = new Map();

  createSession(
    id: string,
    onData: (data: string) => void,
    onExit: (code: number) => void,
    onCommandComplete: (commandId: string, exitCode: number) => void,
    initialCommand?: string
  ): ChildProcess | null {
    // Kill existing session if it exists
    if (this.sessions.has(id)) {
      this.destroy(id);
    }

    const shell = process.env.SHELL || '/bin/zsh';
    console.log(`[TerminalManager] Spawning shell: ${shell}`);

    let childProcess: ChildProcess;
    try {
      // Spawn shell as a login shell for proper initialization
      childProcess = spawn(shell, ['-l'], {
        cwd: process.env.HOME || process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          // Force color output even without TTY
          CLICOLOR_FORCE: '1',
          FORCE_COLOR: '1',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: true,
      });
    } catch (error) {
      console.error(`[TerminalManager] Failed to spawn shell:`, error);
      onExit(-1);
      return null;
    }

    if (!childProcess.stdout || !childProcess.stdin) {
      console.error(`[TerminalManager] Shell stdio not available`);
      onExit(-1);
      return null;
    }

    // Send a welcome message and show we're connected
    onData(`\x1b[32m[Terminal connected to ${shell}]\x1b[0m\r\n`);

    const session: TerminalSession = {
      process: childProcess,
      createdAt: new Date(),
      outputBuffer: '',
    };

    // Handle stdout with marker detection
    childProcess.stdout.on('data', (data: Buffer) => {
      const output = data.toString();

      // Check for command completion markers and notify
      this.parseCommandCompletions(id, output, onCommandComplete);

      // Filter out the marker lines before sending to client
      const filteredOutput = this.filterMarkers(output);
      if (filteredOutput) {
        onData(filteredOutput);
      }
    });

    // Handle stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      onData(data.toString());
    });

    // Handle exit
    childProcess.on('exit', (code) => {
      console.log(`[TerminalManager] Shell exited with code: ${code}`);
      this.sessions.delete(id);
      onExit(code ?? 0);
    });

    childProcess.on('error', (error) => {
      console.error(`[TerminalManager] Shell error:`, error);
      this.sessions.delete(id);
      onExit(-1);
    });

    this.sessions.set(id, session);

    // Send initial command after a brief delay for shell startup
    if (initialCommand) {
      setTimeout(() => {
        console.log(`[TerminalManager] Sending initial command: ${initialCommand}`);
        childProcess.stdin?.write(initialCommand + '\n');
      }, 200);
    }

    console.log(`[TerminalManager] Session ${id} created successfully`);
    return childProcess;
  }

  /**
   * Execute a command with completion tracking
   */
  executeCommand(
    sessionId: string,
    command: string,
    commandId: string
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session?.process.stdin) {
      console.error(`[TerminalManager] Session ${sessionId} not found`);
      return;
    }

    // Wrap command to output exit code with unique marker when done
    // Format: command; echo "__NEURO_ORCH_CMD_DONE__<commandId>:$?"
    const wrappedCommand = `${command}; echo "${COMMAND_MARKER_PREFIX}${commandId}:$?"`;

    console.log(`[TerminalManager] Executing tracked command ${commandId}: ${command}`);
    session.process.stdin.write(wrappedCommand + '\n');
  }

  /**
   * Parse output for completion markers
   */
  private parseCommandCompletions(
    sessionId: string,
    output: string,
    onComplete: (commandId: string, exitCode: number) => void
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Accumulate output for multi-chunk markers
    session.outputBuffer += output;

    // Look for completion markers
    const markerRegex = new RegExp(
      `${COMMAND_MARKER_PREFIX}([a-f0-9-]+):(\\d+)`,
      'g'
    );

    let match;
    while ((match = markerRegex.exec(session.outputBuffer)) !== null) {
      const commandId = match[1];
      const exitCode = parseInt(match[2], 10);

      console.log(`[TerminalManager] Command ${commandId} completed with exit code ${exitCode}`);
      onComplete(commandId, exitCode);
    }

    // Clear processed parts of buffer (keep last 500 chars for partial markers)
    if (session.outputBuffer.length > 1000) {
      session.outputBuffer = session.outputBuffer.slice(-500);
    }
  }

  /**
   * Filter out marker lines from output sent to client
   */
  private filterMarkers(output: string): string {
    return output
      .split('\n')
      .filter(line => !line.includes(COMMAND_MARKER_PREFIX))
      .join('\n');
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  write(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (session?.process.stdin) {
      session.process.stdin.write(data);
    }
  }

  resize(_id: string, _cols: number, _rows: number): void {
    // Resize not supported with child_process approach
  }

  destroy(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      this.killProcessGroup(session.process);
      this.sessions.delete(id);
    }
  }

  destroyAll(): void {
    for (const [id] of this.sessions) {
      this.destroy(id);
    }
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  getSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  private killProcessGroup(child: ChildProcess): void {
    const pid = child.pid;
    if (!pid) {
      child.kill();
      return;
    }

    try {
      if (process.platform !== 'win32') {
        process.kill(-pid, 'SIGTERM');
      } else {
        child.kill();
      }
    } catch (error) {
      console.error('[TerminalManager] Failed to terminate process group:', error);
      try {
        child.kill();
      } catch (fallbackError) {
        console.error('[TerminalManager] Failed to terminate process:', fallbackError);
      }
    }
  }
}
