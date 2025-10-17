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
   */
  async isCommandAvailable(command: string): Promise<boolean> {
    try {
      const { execSync } = await import('child_process');
      execSync(`which ${command}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}
