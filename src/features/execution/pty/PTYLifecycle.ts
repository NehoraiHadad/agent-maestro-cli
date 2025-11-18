/**
 * PTY Lifecycle - manages PTY process lifecycle and state
 */
import type { IPty } from 'node-pty';
import type { PTYProcessInfo, PTYExitInfo } from '../../../shared/types/index.js';
import { AgentError } from '../../../shared/errors/index.js';
import {
  DEFAULT_MAX_BUFFER_SIZE,
  BUFFER_WARNING_THRESHOLD,
  BUFFER_TRIM_TO_PERCENTAGE
} from '../../../shared/constants/buffers.js';

export class PTYLifecycle {
  private processes: Map<string, PTYProcessInfo>;
  private maxBufferSize: number;
  private bufferTrimCount: Map<string, number>; // Track trim events per process

  constructor(maxBufferSize: number = DEFAULT_MAX_BUFFER_SIZE) {
    this.processes = new Map();
    this.maxBufferSize = maxBufferSize;
    this.bufferTrimCount = new Map();
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
      throw new AgentError(
        id,
        'PTY process not found',
        'PTY_NOT_FOUND'
      );
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
   * Append data to process buffer with automatic rotation
   * @param id - Process identifier
   * @param data - Data to append
   */
  appendToBuffer(id: string, data: string): void {
    const info = this.processes.get(id);
    if (!info) {
      return;
    }

    // Append data
    info.buffer += data;

    // Check if buffer needs trimming
    const currentSize = Buffer.byteLength(info.buffer, 'utf8');

    // Log warning if approaching limit
    if (currentSize > this.maxBufferSize * BUFFER_WARNING_THRESHOLD) {
      this.logBufferWarning(id, currentSize);
    }

    // Trim if exceeded
    if (currentSize > this.maxBufferSize) {
      this.trimBuffer(id);
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

    // Clean up trim count
    this.bufferTrimCount.delete(id);

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

  /**
   * Trim buffer to prevent memory overflow
   * @param id - Process identifier
   */
  private trimBuffer(id: string): void {
    const info = this.processes.get(id);
    if (!info) {
      return;
    }

    const currentSize = Buffer.byteLength(info.buffer, 'utf8');
    const targetSize = Math.floor(this.maxBufferSize * BUFFER_TRIM_TO_PERCENTAGE);

    // Calculate how many bytes to remove
    const bytesToRemove = currentSize - targetSize;

    // Find the character position that roughly corresponds to bytesToRemove
    // This is approximate since UTF-8 characters can be 1-4 bytes
    let removedBytes = 0;
    let charPosition = 0;

    while (removedBytes < bytesToRemove && charPosition < info.buffer.length) {
      const charCode = info.buffer.charCodeAt(charPosition);
      const charByteSize = this.getUtf8ByteSize(charCode);
      removedBytes += charByteSize;
      charPosition++;
    }

    // Trim the buffer (keep most recent data)
    info.buffer = info.buffer.slice(charPosition);

    // Track trim events
    const trimCount = (this.bufferTrimCount.get(id) || 0) + 1;
    this.bufferTrimCount.set(id, trimCount);

    // Log the trim event
    this.logBufferTrimmed(id, bytesToRemove, currentSize, trimCount);
  }

  /**
   * Get UTF-8 byte size for a character code
   * @param charCode - Character code
   * @returns Byte size (1-4)
   */
  private getUtf8ByteSize(charCode: number): number {
    if (charCode <= 0x7F) return 1;
    if (charCode <= 0x7FF) return 2;
    if (charCode <= 0xFFFF) return 3;
    return 4;
  }

  /**
   * Log buffer warning when approaching limit
   * @param id - Process identifier
   * @param currentSize - Current buffer size in bytes
   */
  private logBufferWarning(id: string, currentSize: number): void {
    const percentage = ((currentSize / this.maxBufferSize) * 100).toFixed(1);
    console.warn(
      `[PTYLifecycle] Process ${id} buffer at ${percentage}% capacity ` +
      `(${this.formatBytes(currentSize)} / ${this.formatBytes(this.maxBufferSize)})`
    );
  }

  /**
   * Log buffer trim event
   * @param id - Process identifier
   * @param bytesRemoved - Number of bytes removed
   * @param previousSize - Size before trimming
   * @param trimCount - Total number of trims for this process
   */
  private logBufferTrimmed(
    id: string,
    bytesRemoved: number,
    previousSize: number,
    trimCount: number
  ): void {
    const newSize = previousSize - bytesRemoved;
    console.log(
      `[PTYLifecycle] Buffer trimmed for process ${id} ` +
      `(trim #${trimCount}): ` +
      `${this.formatBytes(previousSize)} → ${this.formatBytes(newSize)} ` +
      `(removed ${this.formatBytes(bytesRemoved)})`
    );
  }

  /**
   * Format bytes to human-readable string
   * @param bytes - Number of bytes
   * @returns Formatted string (e.g., "1.5 MB")
   */
  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  /**
   * Get buffer statistics for a process
   * @param id - Process identifier
   * @returns Buffer stats or null if process not found
   */
  getBufferStats(id: string): {
    currentSize: number;
    maxSize: number;
    utilization: number;
    trimCount: number;
  } | null {
    const info = this.processes.get(id);
    if (!info) {
      return null;
    }

    const currentSize = Buffer.byteLength(info.buffer, 'utf8');
    const utilization = (currentSize / this.maxBufferSize) * 100;
    const trimCount = this.bufferTrimCount.get(id) || 0;

    return {
      currentSize,
      maxSize: this.maxBufferSize,
      utilization,
      trimCount
    };
  }
}
