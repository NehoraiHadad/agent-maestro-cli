/**
 * PTY Event Emitter - manages event handlers for PTY processes
 */
import type { IPty } from 'node-pty';
import type { PTYExitInfo } from '../../../shared/types/index.js';
import {
  DEFAULT_MAX_LISTENERS,
  WARN_ON_LISTENER_THRESHOLD,
  LISTENER_WARNING_THRESHOLD
} from '../../../shared/constants/handlers.js';

export interface ProcessHandlers {
  data: Array<(data: string) => void>;
  exit: Array<(info: PTYExitInfo) => void>;
}

export class PTYEventEmitter {
  private handlers: Map<string, ProcessHandlers>;
  private maxListeners: number;

  constructor(maxListeners: number = DEFAULT_MAX_LISTENERS) {
    this.handlers = new Map();
    this.maxListeners = maxListeners;
  }

  /**
   * Initialize handlers for a process
   * @param id - Process identifier
   */
  initializeHandlers(id: string): void {
    this.handlers.set(id, {
      data: [],
      exit: []
    });
  }

  /**
   * Setup event handlers for a PTY process
   */
  setupHandlers(
    id: string,
    ptyProcess: IPty,
    onData?: (data: string) => void,
    onExit?: (info: PTYExitInfo) => void
  ): void {
    try {
      // Initialize handlers if not already done
      if (!this.hasHandlers(id)) {
        this.initializeHandlers(id);
      }

      // Register provided handlers
      if (onData) {
        this.onData(id, onData);
      }
      if (onExit) {
        this.onExit(id, onExit);
      }

      // Setup actual PTY listeners
      ptyProcess.onData((data: string) => {
        this.emitData(id, data);
      });

      ptyProcess.onExit(({ exitCode, signal }: PTYExitInfo) => {
        this.emitExit(id, { exitCode, signal });
      });

    } catch (error) {
      console.error(`[PTYEventEmitter] Failed to setup handlers for process ${id}:`, error);
      throw error;
    }
  }

  /**
   * Register data handler with limit check
   * @param id - Process identifier
   * @param handler - Data handler function
   * @throws Error if max listeners exceeded
   */
  onData(id: string, handler: (data: string) => void): void {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      throw new Error(`No handlers initialized for process ${id}`);
    }

    // Check limit
    if (handlers.data.length >= this.maxListeners) {
      throw new Error(
        `Maximum listeners (${this.maxListeners}) exceeded for process ${id} data event. ` +
        `This may indicate a memory leak. Current handlers: ${handlers.data.length}`
      );
    }

    // Warn if approaching limit
    if (WARN_ON_LISTENER_THRESHOLD) {
      const threshold = Math.floor(this.maxListeners * LISTENER_WARNING_THRESHOLD);
      if (handlers.data.length >= threshold) {
        console.warn(
          `[PTYEventEmitter] Process ${id} data handlers at ${handlers.data.length}/${this.maxListeners} ` +
          `(${Math.round((handlers.data.length / this.maxListeners) * 100)}%)`
        );
      }
    }

    handlers.data.push(handler);
  }

  /**
   * Register exit handler with limit check
   * @param id - Process identifier
   * @param handler - Exit handler function
   * @throws Error if max listeners exceeded
   */
  onExit(id: string, handler: (info: PTYExitInfo) => void): void {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      throw new Error(`No handlers initialized for process ${id}`);
    }

    // Check limit
    if (handlers.exit.length >= this.maxListeners) {
      throw new Error(
        `Maximum listeners (${this.maxListeners}) exceeded for process ${id} exit event. ` +
        `This may indicate a memory leak. Current handlers: ${handlers.exit.length}`
      );
    }

    // Warn if approaching limit
    if (WARN_ON_LISTENER_THRESHOLD) {
      const threshold = Math.floor(this.maxListeners * LISTENER_WARNING_THRESHOLD);
      if (handlers.exit.length >= threshold) {
        console.warn(
          `[PTYEventEmitter] Process ${id} exit handlers at ${handlers.exit.length}/${this.maxListeners}`
        );
      }
    }

    handlers.exit.push(handler);
  }

  /**
   * Remove a specific data handler
   * @param id - Process identifier
   * @param handler - Handler to remove
   * @returns True if handler was found and removed
   */
  removeDataHandler(id: string, handler: (data: string) => void): boolean {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return false;
    }

    const index = handlers.data.indexOf(handler);
    if (index !== -1) {
      handlers.data.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Remove a specific exit handler
   * @param id - Process identifier
   * @param handler - Handler to remove
   * @returns True if handler was found and removed
   */
  removeExitHandler(
    id: string,
    handler: (info: PTYExitInfo) => void
  ): boolean {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return false;
    }

    const index = handlers.exit.indexOf(handler);
    if (index !== -1) {
      handlers.exit.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Remove all handlers for a process (alias for backward compatibility)
   * @param id - Process identifier
   */
  remove(id: string): void {
    this.removeAllHandlers(id);
  }

  /**
   * Remove all handlers for a process
   * @param id - Process identifier
   */
  removeAllHandlers(id: string): void {
    this.handlers.delete(id);
  }

  /**
   * Clear all handlers for all processes
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get handler statistics
   * @param id - Process identifier
   * @returns Handler stats or null if process not found
   */
  getHandlerStats(id: string): {
    dataHandlers: number;
    exitHandlers: number;
    totalHandlers: number;
    maxListeners: number;
    utilizationPercent: number;
  } | null {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return null;
    }

    const dataHandlers = handlers.data.length;
    const exitHandlers = handlers.exit.length;
    const totalHandlers = dataHandlers + exitHandlers;
    const utilizationPercent = (Math.max(dataHandlers, exitHandlers) / this.maxListeners) * 100;

    return {
      dataHandlers,
      exitHandlers,
      totalHandlers,
      maxListeners: this.maxListeners,
      utilizationPercent
    };
  }

  /**
   * Get all process IDs with handlers
   * @returns Array of process IDs
   */
  getProcessIds(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get total handler count across all processes
   * @returns Total number of handlers
   */
  getTotalHandlerCount(): number {
    let total = 0;
    for (const handlers of this.handlers.values()) {
      total += handlers.data.length + handlers.exit.length;
    }
    return total;
  }

  /**
   * Check if a process has handlers
   * @param id - Process identifier
   * @returns True if process has handlers
   */
  hasHandlers(id: string): boolean {
    return this.handlers.has(id);
  }

  /**
   * Emit data event to all registered handlers
   * @param id - Process identifier
   * @param data - Data to emit
   */
  emitData(id: string, data: string): void {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return;
    }

    // Call all handlers (use slice to avoid issues if handler modifies array)
    for (const handler of handlers.data.slice()) {
      try {
        handler(data);
      } catch (error) {
        console.error(`[PTYEventEmitter] Error in data handler for process ${id}:`, error);
      }
    }
  }

  /**
   * Emit exit event to all registered handlers
   * @param id - Process identifier
   * @param exitInfo - Exit information
   */
  emitExit(id: string, exitInfo: PTYExitInfo): void {
    const handlers = this.handlers.get(id);
    if (!handlers) {
      return;
    }

    // Call all handlers
    for (const handler of handlers.exit.slice()) {
      try {
        handler(exitInfo);
      } catch (error) {
        console.error(`[PTYEventEmitter] Error in exit handler for process ${id}:`, error);
      }
    }

    // Clean up handlers after exit
    this.removeAllHandlers(id);
  }
}
