import { spawn, ChildProcess } from 'child_process';

interface TerminalSession {
  process: ChildProcess;
  createdAt: Date;
}

export class TerminalManager {
  private sessions: Map<string, TerminalSession> = new Map();

  createSession(
    id: string,
    onData: (data: string) => void,
    onExit: (code: number) => void,
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

    // Handle stdout
    childProcess.stdout.on('data', (data: Buffer) => {
      onData(data.toString());
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

    this.sessions.set(id, { process: childProcess, createdAt: new Date() });

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
