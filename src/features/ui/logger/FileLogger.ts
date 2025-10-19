/**
 * FileLogger.ts
 * File-based logging with buffering, auto-flush, and log rotation
 */

import { promises as fs, existsSync, statSync } from 'fs';
import { dirname, join, parse } from 'path';
import { DEFAULT_LOG_FLUSH_INTERVAL_MS } from '../../../shared/constants/index.js';

export interface FileLoggerOptions {
  autoFlush?: boolean;
  flushIntervalMs?: number;
  enableRotation?: boolean;
  maxFiles?: number;
  maxSizeBytes?: number;
}

/**
 * File logger with buffered writes, auto-flush, and log rotation
 */
export class FileLogger {
  private filePath: string;
  private buffer: string[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly autoFlush: boolean;
  private readonly flushIntervalMs: number;
  private readonly enableRotation: boolean;
  private readonly maxFiles: number;
  private readonly maxSizeBytes: number;
  private isClosing: boolean = false;

  /**
   * Create a new file logger
   * @param filePath - Path to the log file
   * @param options - Logger configuration options
   */
  constructor(filePath: string, options: FileLoggerOptions = {}) {
    this.filePath = filePath;
    this.autoFlush = options.autoFlush ?? true;
    this.flushIntervalMs = options.flushIntervalMs ?? DEFAULT_LOG_FLUSH_INTERVAL_MS;
    this.enableRotation = options.enableRotation ?? true;
    this.maxFiles = options.maxFiles ?? 10;
    this.maxSizeBytes = options.maxSizeBytes ?? 10 * 1024 * 1024; // 10MB

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
    if (this.buffer.length === 0 || this.isClosing) {
      return;
    }

    const entries = this.buffer.splice(0, this.buffer.length);
    const content = entries.join('\n') + '\n';

    try {
      // Ensure directory exists
      await this.ensureDirectory();

      // Check if rotation is needed
      if (this.enableRotation) {
        await this.rotateIfNeeded();
      }

      // Append to file
      await fs.appendFile(this.filePath, content, 'utf8');
    } catch (error) {
      // Re-add entries to buffer if write failed
      this.buffer.unshift(...entries);

      // Log error to stderr without causing infinite loop
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[FileLogger] Failed to flush logs: ${errorMsg}`);

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
    this.isClosing = true;
    this.stopAutoFlush();

    // Final flush
    if (this.buffer.length > 0) {
      const entries = this.buffer.splice(0, this.buffer.length);
      const content = entries.join('\n') + '\n';

      try {
        await this.ensureDirectory();
        await fs.appendFile(this.filePath, content, 'utf8');
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[FileLogger] Failed to flush during close: ${errorMsg}`);
      }
    }
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

  /**
   * Rotate log file if it exceeds max size
   */
  private async rotateIfNeeded(): Promise<void> {
    try {
      // Check if file exists and get size
      if (!existsSync(this.filePath)) {
        return;
      }

      const stats = statSync(this.filePath);
      if (stats.size < this.maxSizeBytes) {
        return;
      }

      // Perform rotation
      await this.performRotation();
    } catch (error) {
      // Log error but don't throw - rotation failure shouldn't stop logging
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[FileLogger] Log rotation failed: ${errorMsg}`);
    }
  }

  /**
   * Perform log file rotation
   */
  private async performRotation(): Promise<void> {
    const { dir, name, ext } = parse(this.filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rotatedPath = join(dir, `${name}.${timestamp}${ext}`);

    // Rename current log file
    await fs.rename(this.filePath, rotatedPath);

    // Clean up old log files
    await this.cleanupOldLogs();
  }

  /**
   * Clean up old rotated log files
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const { dir, name, ext } = parse(this.filePath);
      const files = await fs.readdir(dir);

      // Find all rotated log files for this logger
      const rotatedFiles = files
        .filter(f => f.startsWith(name + '.') && f.endsWith(ext))
        .map(f => ({
          name: f,
          path: join(dir, f),
          stat: statSync(join(dir, f))
        }))
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs); // Newest first

      // Delete old files beyond max count
      const filesToDelete = rotatedFiles.slice(this.maxFiles);
      for (const file of filesToDelete) {
        await fs.unlink(file.path);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[FileLogger] Failed to cleanup old logs: ${errorMsg}`);
    }
  }

  /**
   * Get current log file size
   */
  getFileSize(): number {
    try {
      if (existsSync(this.filePath)) {
        return statSync(this.filePath).size;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get current buffer size (number of pending log entries)
   */
  getBufferSize(): number {
    return this.buffer.length;
  }
}
