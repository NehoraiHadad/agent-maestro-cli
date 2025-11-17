/**
 * PTY Spawner - handles spawning pseudo-terminal processes
 */
import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import type { PTYOptions } from '../../../shared/types/index.js';
import { PTYSpawnError } from '../../../shared/errors/index.js';

export class PTYSpawner {
  /**
   * Spawn a new PTY process
   */
  spawn(command: string, args: string[] = [], options: PTYOptions = {}): IPty {
    try {
      const ptyOptions = this.buildOptions(options);

      const ptyProcess = pty.spawn(command, args, ptyOptions);

      return ptyProcess;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new PTYSpawnError(command, reason);
    }
  }

  /**
   * Build PTY options with defaults
   */
  private buildOptions(options: PTYOptions): pty.IPtyForkOptions {
    return {
      name: options.name || 'xterm-color',
      cols: options.cols || process.stdout.columns || 80,
      rows: options.rows || process.stdout.rows || 30,
      cwd: options.cwd || process.cwd(),
      env: options.env || process.env
    };
  }

  /**
   * Check if command exists in system
   * Uses spawn instead of execSync to prevent command injection
   */
  async isCommandAvailable(command: string): Promise<boolean> {
    try {
      const { spawn } = await import('child_process');

      // Sanitize command name - only allow alphanumeric, dash, underscore, and dot
      if (!/^[a-zA-Z0-9_.-]+$/.test(command)) {
        return false;
      }

      return new Promise((resolve) => {
        const child = spawn('which', [command], {
          stdio: 'ignore',
          shell: false // Explicitly disable shell to prevent injection
        });

        child.on('close', (code) => {
          resolve(code === 0);
        });

        child.on('error', () => {
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }
}
