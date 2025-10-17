/**
 * PTY Event Emitter - manages event handlers for PTY processes
 */
import type { IPty } from 'node-pty';
import type { PTYEventHandlers, PTYExitInfo } from '../../../shared/types/index.js';

export class PTYEventEmitter {
  private handlers: Map<string, PTYEventHandlers>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Setup event handlers for a PTY process
   */
  setupHandlers(id: string, ptyProcess: IPty): void {
    const handlers: PTYEventHandlers = {
      data: [],
      exit: []
    };

    // Handle data events
    ptyProcess.onData((data: string) => {
      handlers.data.forEach(handler => handler(data));
    });

    // Handle exit events
    ptyProcess.onExit(({ exitCode, signal }: PTYExitInfo) => {
      const exitInfo: PTYExitInfo = { exitCode, signal };
      handlers.exit.forEach(handler => handler(exitInfo));
    });

    this.handlers.set(id, handlers);
  }

  /**
   * Register data handler
   */
  onData(id: string, handler: (data: string) => void): void {
    const handlers = this.handlers.get(id);
    if (handlers) {
      handlers.data.push(handler);
    }
  }

  /**
   * Register exit handler
   */
  onExit(id: string, handler: (info: PTYExitInfo) => void): void {
    const handlers = this.handlers.get(id);
    if (handlers) {
      handlers.exit.push(handler);
    }
  }

  /**
   * Remove all handlers for a process
   */
  remove(id: string): void {
    this.handlers.delete(id);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
  }
}
