import pty from 'node-pty';
import { EventEmitter } from 'events';

export class TerminalSession extends EventEmitter {
  constructor(terminalType) {
    super();
    this.terminalType = terminalType;
    this.ptyProcess = null;
    this.isActive = false;
    this.workingDirectory = process.cwd();
  }

  start() {
    if (this.isActive) {
      return;
    }

    const shell = process.platform === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/bash';

    this.ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 24,
      cwd: this.workingDirectory,
      env: process.env,
    });

    this.ptyProcess.onData((data) => {
      this.emit('output', data);
    });

    this.ptyProcess.onExit((code, signal) => {
      this.isActive = false;
      this.emit('exit', { code, signal });
    });

    this.isActive = true;
    this.emit('started');
  }

  write(data) {
    if (this.ptyProcess && this.isActive) {
      this.ptyProcess.write(data);
    }
  }

  resize(cols, rows) {
    if (this.ptyProcess && this.isActive) {
      this.ptyProcess.resize(cols, rows);
    }
  }

  kill() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
      this.isActive = false;
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      terminalType: this.terminalType,
      workingDirectory: this.workingDirectory,
    };
  }
}
