/**
 * PTY Spawner - handles spawning pseudo-terminal processes
 */
import * as pty from 'node-pty';
import type { IPty } from 'node-pty';
import type { PTYOptions } from '../../../shared/types/index.js';
import { PTYSpawnError } from '../../../shared/errors/index.js';
import {
  SAFE_ENV_ALLOWLIST,
  SENSITIVE_ENV_PATTERNS,
  OPTIONAL_SAFE_ENV
} from '../../../shared/constants/environment.js';

export class PTYSpawner {
  private includeOptionalEnv: boolean;

  constructor(includeOptionalEnv: boolean = false) {
    this.includeOptionalEnv = includeOptionalEnv;
  }

  /**
   * Spawn a new PTY process
   */
  spawn(command: string, args: string[] = [], options: PTYOptions = {}): IPty {
    try {
      // Log environment filtering stats
      const envStats = this.getEnvironmentStats();
      console.log(
        `[PTYSpawner] Environment filtering: ` +
        `${envStats.allowedVars} allowed, ${envStats.filteredVars} filtered ` +
        `(total: ${envStats.totalSystemVars})`
      );

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
      env: options.env || this.getFilteredEnvironment()
    };
  }

  /**
   * Get filtered environment variables safe for PTY processes
   * @returns Filtered environment object
   */
  private getFilteredEnvironment(): NodeJS.ProcessEnv {
    const safeEnv: NodeJS.ProcessEnv = {};
    const allowedKeys = new Set([
      ...SAFE_ENV_ALLOWLIST,
      ...(this.includeOptionalEnv ? OPTIONAL_SAFE_ENV : [])
    ]);

    // Copy allowed variables
    for (const key of allowedKeys) {
      if (process.env[key] !== undefined) {
        safeEnv[key] = process.env[key];
      }
    }

    // Double-check: remove any sensitive variables that might have slipped through
    this.removeSensitiveVariables(safeEnv);

    return safeEnv;
  }

  /**
   * Remove sensitive environment variables based on patterns
   * @param env - Environment object to filter
   */
  private removeSensitiveVariables(env: NodeJS.ProcessEnv): void {
    const keysToRemove: string[] = [];

    for (const key in env) {
      for (const pattern of SENSITIVE_ENV_PATTERNS) {
        if (pattern.test(key)) {
          keysToRemove.push(key);
          console.warn(
            `[PTYSpawner] Removing sensitive environment variable: ${key}`
          );
          break;
        }
      }
    }

    // Remove identified sensitive keys
    for (const key of keysToRemove) {
      delete env[key];
    }
  }

  /**
   * Validate that environment is safe (for debugging)
   * @param env - Environment to validate
   * @returns Array of warnings about potentially unsafe variables
   */
  validateEnvironmentSafety(env: NodeJS.ProcessEnv): string[] {
    const warnings: string[] = [];

    for (const key in env) {
      // Check against allowlist
      if (
        !SAFE_ENV_ALLOWLIST.includes(key) &&
        !(this.includeOptionalEnv && OPTIONAL_SAFE_ENV.includes(key))
      ) {
        warnings.push(`Non-allowlisted variable: ${key}`);
      }

      // Check against sensitive patterns
      for (const pattern of SENSITIVE_ENV_PATTERNS) {
        if (pattern.test(key)) {
          warnings.push(`Potentially sensitive variable: ${key}`);
          break;
        }
      }
    }

    return warnings;
  }

  /**
   * Get environment statistics for logging
   * @returns Environment stats
   */
  getEnvironmentStats(): {
    totalSystemVars: number;
    allowedVars: number;
    filteredVars: number;
  } {
    const totalSystemVars = Object.keys(process.env).length;
    const filtered = this.getFilteredEnvironment();
    const allowedVars = Object.keys(filtered).length;
    const filteredVars = totalSystemVars - allowedVars;

    return {
      totalSystemVars,
      allowedVars,
      filteredVars
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
