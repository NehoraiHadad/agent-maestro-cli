/**
 * FileSystemStorage - File-based storage implementation
 * Stores sessions in ~/.maestro/sessions/
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { StorageBackend } from './StorageBackend.js';

/**
 * File system storage implementation
 */
export class FileSystemStorage implements StorageBackend {
  private baseDir: string;
  private indexFile: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || join(homedir(), '.maestro', 'sessions');
    this.indexFile = join(this.baseDir, 'sessions.index.json');
  }

  /**
   * Initialize storage directory
   */
  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  /**
   * Get file path for a session
   */
  private getSessionPath(sessionId: string): string {
    return join(this.baseDir, `${sessionId}.json`);
  }

  /**
   * Write session data to storage
   */
  async write(sessionId: string, data: string): Promise<void> {
    await this.ensureDirectory();
    const filePath = this.getSessionPath(sessionId);
    await fs.writeFile(filePath, data, 'utf-8');
  }

  /**
   * Read session data from storage
   */
  async read(sessionId: string): Promise<string> {
    const filePath = this.getSessionPath(sessionId);
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Session not found: ${sessionId}`);
      }
      throw error;
    }
  }

  /**
   * List all session IDs in storage
   */
  async list(): Promise<string[]> {
    await this.ensureDirectory();

    try {
      const files = await fs.readdir(this.baseDir);
      return files
        .filter(file => file.endsWith('.json') && file !== 'sessions.index.json')
        .map(file => file.replace('.json', ''));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete a session from storage
   */
  async delete(sessionId: string): Promise<void> {
    const filePath = this.getSessionPath(sessionId);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Session not found: ${sessionId}`);
      }
      throw error;
    }
  }

  /**
   * Check if a session exists in storage
   */
  async exists(sessionId: string): Promise<boolean> {
    const filePath = this.getSessionPath(sessionId);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read session index
   */
  async readIndex(): Promise<Record<string, any>> {
    try {
      const data = await fs.readFile(this.indexFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { sessions: {}, lastUpdated: new Date().toISOString() };
      }
      throw error;
    }
  }

  /**
   * Write session index
   */
  async writeIndex(index: Record<string, any>): Promise<void> {
    await this.ensureDirectory();
    await fs.writeFile(this.indexFile, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Get the base directory for sessions
   */
  getBaseDir(): string {
    return this.baseDir;
  }
}
