/**
 * PTY Manager - Manages pseudo-terminal processes for agents
 */

import * as pty from 'node-pty';
import { PTYError } from './errors.js';
import { Logger } from '../utils/logger.js';

export class PTYManager {
  constructor() {
    this.processes = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Spawn a new PTY process for an agent
   */
  spawn(id, command, args = [], options = {}) {
    try {
      const defaultOptions = {
        name: 'xterm-color',
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 30,
        cwd: process.cwd(),
        env: process.env
      };

      const ptyProcess = pty.spawn(command, args, {
        ...defaultOptions,
        ...options
      });

      // Store process
      this.processes.set(id, {
        process: ptyProcess,
        command,
        args,
        startTime: Date.now(),
        buffer: '',
        status: 'running'
      });

      // Setup event handlers
      this.setupEventHandlers(id, ptyProcess);

      Logger.debug(`Spawned PTY process: ${id} (${command})`);

      return ptyProcess;
    } catch (error) {
      throw new PTYError(`Failed to spawn process: ${error.message}`);
    }
  }

  /**
   * Setup event handlers for a PTY process
   */
  setupEventHandlers(id, ptyProcess) {
    const handlers = {
      data: [],
      exit: []
    };

    ptyProcess.onData((data) => {
      // Append to buffer
      const processInfo = this.processes.get(id);
      if (processInfo) {
        processInfo.buffer += data;
      }

      // Call registered handlers
      handlers.data.forEach(handler => handler(data));
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      const processInfo = this.processes.get(id);
      if (processInfo) {
        processInfo.status = 'exited';
        processInfo.exitCode = exitCode;
        processInfo.signal = signal;
      }

      // Call registered handlers
      handlers.exit.forEach(handler => handler({ exitCode, signal }));

      Logger.debug(`PTY process exited: ${id} (code: ${exitCode})`);
    });

    this.eventHandlers.set(id, handlers);
  }

  /**
   * Register data handler for a process
   */
  onData(id, handler) {
    const handlers = this.eventHandlers.get(id);
    if (handlers) {
      handlers.data.push(handler);
    }
    return this;
  }

  /**
   * Register exit handler for a process
   */
  onExit(id, handler) {
    const handlers = this.eventHandlers.get(id);
    if (handlers) {
      handlers.exit.push(handler);
    }
    return this;
  }

  /**
   * Write data to a process
   */
  write(id, data) {
    const processInfo = this.processes.get(id);
    if (!processInfo) {
      throw new PTYError(`Process not found: ${id}`);
    }

    if (processInfo.status !== 'running') {
      throw new PTYError(`Process is not running: ${id}`);
    }

    processInfo.process.write(data);
    return this;
  }

  /**
   * Resize a process terminal
   */
  resize(id, cols, rows) {
    const processInfo = this.processes.get(id);
    if (!processInfo) {
      throw new PTYError(`Process not found: ${id}`);
    }

    processInfo.process.resize(cols, rows);
    return this;
  }

  /**
   * Kill a process
   */
  kill(id, signal = 'SIGTERM') {
    const processInfo = this.processes.get(id);
    if (!processInfo) {
      return false;
    }

    processInfo.process.kill(signal);
    processInfo.status = 'killed';
    return true;
  }

  /**
   * Get process info
   */
  getProcess(id) {
    return this.processes.get(id);
  }

  /**
   * Get process buffer
   */
  getBuffer(id) {
    const processInfo = this.processes.get(id);
    return processInfo ? processInfo.buffer : '';
  }

  /**
   * Clear process buffer
   */
  clearBuffer(id) {
    const processInfo = this.processes.get(id);
    if (processInfo) {
      processInfo.buffer = '';
    }
    return this;
  }

  /**
   * Check if process is running
   */
  isRunning(id) {
    const processInfo = this.processes.get(id);
    return processInfo && processInfo.status === 'running';
  }

  /**
   * Get all running processes
   */
  getRunningProcesses() {
    return Array.from(this.processes.entries())
      .filter(([, info]) => info.status === 'running')
      .map(([id]) => id);
  }

  /**
   * Clean up finished processes
   */
  cleanup() {
    for (const [id, processInfo] of this.processes.entries()) {
      if (processInfo.status !== 'running') {
        this.processes.delete(id);
        this.eventHandlers.delete(id);
        Logger.debug(`Cleaned up process: ${id}`);
      }
    }
    return this;
  }

  /**
   * Kill all processes and cleanup
   */
  killAll() {
    for (const id of this.processes.keys()) {
      this.kill(id);
    }
    this.processes.clear();
    this.eventHandlers.clear();
    Logger.debug('Killed all PTY processes');
    return this;
  }
}

export default PTYManager;
