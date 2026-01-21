import * as pty from 'node-pty';

// Unique marker that won't appear in normal output
const COMMAND_MARKER_PREFIX = '__NEURO_ORCH_CMD_DONE__';

interface TerminalSession {
  pty: pty.IPty;
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
  ): pty.IPty | null {
    // Kill existing session if it exists
    if (this.sessions.has(id)) {
      this.destroy(id);
    }

    const shell = process.env.SHELL || (process.platform === 'win32' ? 'powershell.exe' : '/bin/bash');
    console.log(`[TerminalManager] Spawning shell: ${shell}`);

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: process.env.HOME || process.cwd(),
        env: process.env as { [key: string]: string },
      });
    } catch (error) {
      console.error(`[TerminalManager] Failed to spawn shell:`, error);
      onExit(-1);
      return null;
    }

    const session: TerminalSession = {
      pty: ptyProcess,
      createdAt: new Date(),
      outputBuffer: '',
    };

    // Handle output with marker detection
    ptyProcess.onData((data: string) => {
      // Check for command completion markers and notify
      this.parseCommandCompletions(id, data, onCommandComplete);

      // Filter out the marker lines before sending to client
      const filteredOutput = this.filterMarkers(data);
      if (filteredOutput) {
        onData(filteredOutput);
      }
    });

    // Handle exit
    ptyProcess.onExit(({ exitCode }) => {
      console.log(`[TerminalManager] Shell exited with code: ${exitCode}`);
      this.sessions.delete(id);
      onExit(exitCode);
    });

    this.sessions.set(id, session);

    // Send initial command after a brief delay for shell startup
    if (initialCommand) {
      setTimeout(() => {
        console.log(`[TerminalManager] Sending initial command: ${initialCommand}`);
        ptyProcess.write(initialCommand + '\r');
      }, 200);
    }

    console.log(`[TerminalManager] Session ${id} created successfully`);
    return ptyProcess;
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
    if (!session) {
      console.error(`[TerminalManager] Session ${sessionId} not found`);
      return;
    }

    // Wrap command to output exit code with unique marker when done
    const wrappedCommand = `${command}; echo "${COMMAND_MARKER_PREFIX}${commandId}:$?"`;

    console.log(`[TerminalManager] Executing tracked command ${commandId}: ${command}`);
    session.pty.write(wrappedCommand + '\r');
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
    if (session) {
      session.pty.write(data);
    }
  }

  resize(id: string, cols: number, rows: number): void {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.resize(cols, rows);
    }
  }

  destroy(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.pty.kill();
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
}
