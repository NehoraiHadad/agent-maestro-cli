/**
 * PTY Lifecycle - manages PTY process lifecycle and state
 */
import type { IPty } from 'node-pty';
import type { PTYProcessInfo, PTYExitInfo } from '../../../shared/types/index.js';
import { PTYProcessNotFoundError } from '../../../shared/errors/index.js';

export class PTYLifecycle {
  private processes: Map<string, PTYProcessInfo>;

  constructor() {
    this.processes = new Map();
  }

  /**
   * Register a new process
   */
  register(
    id: string,
    process: IPty,
    command: string,
    args: string[]
  ): void {
    const info: PTYProcessInfo = {
      process,
      command,
      args,
      startTime: Date.now(),
      buffer: '',
      status: 'running'
    };

    this.processes.set(id, info);
  }

  /**
   * Get process info
   */
  get(id: string): PTYProcessInfo {
    const info = this.processes.get(id);
    if (!info) {
      throw new PTYProcessNotFoundError(id);
    }
    return info;
  }

  /**
   * Check if process exists
   */
  exists(id: string): boolean {
    return this.processes.has(id);
  }

  /**
   * Check if process is running
   */
  isRunning(id: string): boolean {
    const info = this.processes.get(id);
    return info ? info.status === 'running' : false;
  }

  /**
   * Mark process as exited
   */
  markExited(id: string, exitInfo: PTYExitInfo): void {
    const info = this.processes.get(id);
    if (info) {
      info.status = 'exited';
      info.exitCode = exitInfo.exitCode;
      info.signal = exitInfo.signal;
    }
  }

  /**
   * Mark process as killed
   */
  markKilled(id: string): void {
    const info = this.processes.get(id);
    if (info) {
      info.status = 'killed';
    }
  }

  /**
   * Append data to process buffer
   */
  appendToBuffer(id: string, data: string): void {
    const info = this.processes.get(id);
    if (info) {
      info.buffer += data;
    }
  }

  /**
   * Get process buffer
   */
  getBuffer(id: string): string {
    const info = this.processes.get(id);
    return info ? info.buffer : '';
  }

  /**
   * Clear process buffer
   */
  clearBuffer(id: string): void {
    const info = this.processes.get(id);
    if (info) {
      info.buffer = '';
    }
  }

  /**
   * Kill a process
   */
  kill(id: string, signal: string = 'SIGTERM'): boolean {
    const info = this.processes.get(id);
    if (!info) {
      return false;
    }

    const ptyProcess = info.process as IPty;
    ptyProcess.kill(signal);
    this.markKilled(id);
    return true;
  }

  /**
   * Remove process from registry
   */
  remove(id: string): void {
    this.processes.delete(id);
  }

  /**
   * Get all running process IDs
   */
  getRunningIds(): string[] {
    return Array.from(this.processes.entries())
      .filter(([, info]) => info.status === 'running')
      .map(([id]) => id);
  }

  /**
   * Cleanup finished processes
   */
  cleanup(): void {
    for (const [id, info] of this.processes.entries()) {
      if (info.status !== 'running') {
        this.processes.delete(id);
      }
    }
  }

  /**
   * Kill all processes
   */
  killAll(): void {
    for (const id of this.processes.keys()) {
      this.kill(id);
    }
    this.processes.clear();
  }
}
