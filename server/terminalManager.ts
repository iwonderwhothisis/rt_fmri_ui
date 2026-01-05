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
      childProcess = spawn(shell, ['-i'], {
        cwd: process.env.HOME || process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (error) {
      console.error(`[TerminalManager] Failed to spawn shell:`, error);
      onExit(-1);
      return null;
    }

    if (!childProcess.stdout || !childProcess.stderr || !childProcess.stdin) {
      console.error(`[TerminalManager] Shell stdio not available`);
      onExit(-1);
      return null;
    }

    // Handle stdout
    childProcess.stdout.on('data', (data: Buffer) => {
      onData(data.toString());
    });

    // Handle stderr
    childProcess.stderr.on('data', (data: Buffer) => {
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

    // Send initial command if provided
    if (initialCommand && childProcess.stdin) {
      setTimeout(() => {
        childProcess.stdin?.write(initialCommand + '\n');
      }, 100);
    }

    console.log(`[TerminalManager] Session ${id} created successfully`);
    return childProcess;
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  write(id: string, data: string): void {
    const session = this.sessions.get(id);
    if (session && session.process.stdin) {
      session.process.stdin.write(data);
    }
  }

  resize(_id: string, _cols: number, _rows: number): void {
    // Not supported with child_process (no PTY)
    // Could use node-pty in the future for full PTY support
  }

  destroy(id: string): void {
    const session = this.sessions.get(id);
    if (session) {
      session.process.kill();
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
