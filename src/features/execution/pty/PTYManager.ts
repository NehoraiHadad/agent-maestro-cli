/**
 * PTY Manager - orchestrates PTY spawning, lifecycle, and events
 */
import type { IPty } from 'node-pty';
import type { PTYOptions, PTYExitInfo } from '../../../shared/types/index.js';
import { PTYSpawner } from './PTYSpawner.js';
import { PTYLifecycle } from './PTYLifecycle.js';
import { PTYEventEmitter } from './PTYEventEmitter.js';
import { PTYWriteError } from '../../../shared/errors/index.js';

export class PTYManager {
  private spawner: PTYSpawner;
  private lifecycle: PTYLifecycle;
  private eventEmitter: PTYEventEmitter;

  constructor() {
    this.spawner = new PTYSpawner();
    this.lifecycle = new PTYLifecycle();
    this.eventEmitter = new PTYEventEmitter();
  }

  /**
   * Spawn a new PTY process
   */
  spawn(id: string, command: string, args: string[] = [], options: PTYOptions = {}): IPty {
    // Spawn process
    const ptyProcess = this.spawner.spawn(command, args, options);

    // Register with lifecycle manager
    this.lifecycle.register(id, ptyProcess, command, args);

    // Setup event handlers
    this.eventEmitter.setupHandlers(id, ptyProcess);

    // Setup automatic buffer collection
    this.eventEmitter.onData(id, (data: string) => {
      this.lifecycle.appendToBuffer(id, data);
    });

    // Setup automatic status updates on exit
    this.eventEmitter.onExit(id, (exitInfo: PTYExitInfo) => {
      this.lifecycle.markExited(id, exitInfo);
    });

    return ptyProcess;
  }

  /**
   * Register data handler
   */
  onData(id: string, handler: (data: string) => void): this {
    this.eventEmitter.onData(id, handler);
    return this;
  }

  /**
   * Register exit handler
   */
  onExit(id: string, handler: (info: PTYExitInfo) => void): this {
    this.eventEmitter.onExit(id, handler);
    return this;
  }

  /**
   * Write data to process
   */
  write(id: string, data: string): void {
    const info = this.lifecycle.get(id);

    if (!this.lifecycle.isRunning(id)) {
      throw new PTYWriteError(id, 'Process is not running');
    }

    try {
      const ptyProcess = info.process as IPty;
      ptyProcess.write(data);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new PTYWriteError(id, reason);
    }
  }

  /**
   * Resize process terminal
   */
  resize(id: string, cols: number, rows: number): void {
    const info = this.lifecycle.get(id);
    const ptyProcess = info.process as IPty;
    ptyProcess.resize(cols, rows);
  }

  /**
   * Kill a process
   */
  kill(id: string, signal: string = 'SIGTERM'): boolean {
    return this.lifecycle.kill(id, signal);
  }

  /**
   * Get process buffer
   */
  getBuffer(id: string): string {
    return this.lifecycle.getBuffer(id);
  }

  /**
   * Clear process buffer
   */
  clearBuffer(id: string): void {
    this.lifecycle.clearBuffer(id);
  }

  /**
   * Check if process is running
   */
  isRunning(id: string): boolean {
    return this.lifecycle.isRunning(id);
  }

  /**
   * Get all running process IDs
   */
  getRunningProcesses(): string[] {
    return this.lifecycle.getRunningIds();
  }

  /**
   * Cleanup finished processes
   */
  cleanup(): void {
    this.lifecycle.cleanup();
  }

  /**
   * Kill all processes gracefully with timeout
   */
  async killAll(gracefulTimeoutMs: number = 5000): Promise<void> {
    const runningIds = this.lifecycle.getRunningIds();
    const killPromises = runningIds.map(id =>
      this.killGracefully(id, gracefulTimeoutMs)
    );
    await Promise.allSettled(killPromises);
  }

  /**
   * Kill a single process gracefully
   * First tries SIGTERM, then SIGKILL after timeout
   */
  private async killGracefully(id: string, timeoutMs: number): Promise<void> {
    try {
      // Try graceful termination first
      this.kill(id, 'SIGTERM');

      // Wait for graceful shutdown
      const startTime = Date.now();
      while (this.isRunning(id) && (Date.now() - startTime < timeoutMs)) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Force kill if still running
      if (this.isRunning(id)) {
        this.kill(id, 'SIGKILL');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } finally {
      // Always cleanup event handlers
      this.eventEmitter.remove(id);
    }
  }

  /**
   * Check command availability
   */
  async isCommandAvailable(command: string): Promise<boolean> {
    try {
      return await this.spawner.isCommandAvailable(command);
    } catch {
      return false;
    }
  }
}
