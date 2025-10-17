/**
 * FileLogger.ts
 * File-based logging with buffering and auto-flush
 */

import { promises as fs } from 'fs';
import { dirname } from 'path';

/**
 * File logger with buffered writes and auto-flush capability
 */
export class FileLogger {
  private filePath: string;
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly autoFlush: boolean;
  private readonly flushIntervalMs: number = 5000; // 5 seconds

  /**
   * Create a new file logger
   * @param filePath - Path to the log file
   * @param autoFlush - Whether to automatically flush buffer periodically
   */
  constructor(filePath: string, autoFlush: boolean = true) {
    this.filePath = filePath;
    this.autoFlush = autoFlush;

    if (this.autoFlush) {
      this.startAutoFlush();
    }
  }

  /**
   * Log a message to the buffer
   * @param level - Log level (e.g., 'INFO', 'ERROR')
   * @param message - Log message
   * @param metadata - Optional metadata object
   */
  log(level: string, message: string, metadata?: Record<string, unknown>): void {
    const entry = this.formatLogEntry(level, message, metadata);
    this.buffer.push(entry);

    // Auto-flush if buffer gets large
    if (this.buffer.length >= 100) {
      this.flush().catch(err => {
        console.error('Failed to flush log buffer:', err);
      });
    }
  }

  /**
   * Write all buffered logs to file
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = this.buffer.splice(0, this.buffer.length);
    const content = entries.join('\n') + '\n';

    try {
      // Ensure directory exists
      await this.ensureDirectory();

      // Append to file
      await fs.appendFile(this.filePath, content, 'utf8');
    } catch (error) {
      // Re-add entries to buffer if write failed
      this.buffer.unshift(...entries);
      throw error;
    }
  }

  /**
   * Clear the log file
   */
  async clear(): Promise<void> {
    try {
      await fs.writeFile(this.filePath, '', 'utf8');
      this.buffer = [];
    } catch (error) {
      throw new Error(`Failed to clear log file: ${error}`);
    }
  }

  /**
   * Stop auto-flush and flush remaining buffer
   */
  async close(): Promise<void> {
    this.stopAutoFlush();
    await this.flush();
  }

  /**
   * Format a log entry as JSON line
   */
  private formatLogEntry(
    level: string,
    message: string,
    metadata?: Record<string, unknown>
  ): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...metadata
    };

    return JSON.stringify(entry);
  }

  /**
   * Ensure log directory exists
   */
  private async ensureDirectory(): Promise<void> {
    const dir = dirname(this.filePath);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  /**
   * Start periodic auto-flush
   */
  private startAutoFlush(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        console.error('Auto-flush failed:', err);
      });
    }, this.flushIntervalMs);

    // Don't prevent process exit
    if (this.flushInterval.unref) {
      this.flushInterval.unref();
    }
  }

  /**
   * Stop auto-flush interval
   */
  private stopAutoFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}
