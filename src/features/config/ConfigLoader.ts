/**
 * ConfigLoader.ts
 * Handles loading and merging configuration from multiple sources with priority
 * Priority: CLI > Environment > File > Defaults
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import type { MaestroConfig, CLIArgs, ConfigSource } from './types.js';
import type { LogLevel } from '../../shared/constants/index.js';

export class ConfigLoader {
  private static readonly CONFIG_FILE_NAME = '.maestrorc.json';

  /**
   * Load configuration from file (~/.maestrorc.json)
   */
  static loadFromFile(path?: string): Partial<MaestroConfig> {
    const configPath = path || join(homedir(), this.CONFIG_FILE_NAME);

    if (!existsSync(configPath)) {
      return {};
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(content);
      return this.normalizeConfig(config);
    } catch (error) {
      console.warn(`Warning: Failed to load config from ${configPath}:`, error instanceof Error ? error.message : String(error));
      return {};
    }
  }

  /**
   * Load configuration from environment variables (MAESTRO_*)
   */
  static loadFromEnv(): Partial<MaestroConfig> {
    const config: Partial<MaestroConfig> = {};
    const env = process.env;

    // Core settings
    if (env.MAESTRO_DEFAULT_MODE) {
      config.defaultMode = env.MAESTRO_DEFAULT_MODE as 'interactive' | 'plan';
    }
    if (env.MAESTRO_PLAN_MODE) {
      config.planMode = this.parseBoolean(env.MAESTRO_PLAN_MODE);
    }
    if (env.MAESTRO_THEME) {
      config.theme = env.MAESTRO_THEME as 'dark' | 'light';
    }
    if (env.MAESTRO_AUTO_SAVE) {
      config.autoSave = this.parseBoolean(env.MAESTRO_AUTO_SAVE);
    }
    if (env.MAESTRO_TIMEOUT) {
      config.timeout = parseInt(env.MAESTRO_TIMEOUT, 10);
    }

    // Logging
    if (env.MAESTRO_LOG_LEVEL) {
      config.logLevel = env.MAESTRO_LOG_LEVEL as LogLevel;
    }
    if (env.MAESTRO_ENABLE_FILE_LOGGING) {
      config.enableFileLogging = this.parseBoolean(env.MAESTRO_ENABLE_FILE_LOGGING);
    }
    if (env.MAESTRO_LOG_DIRECTORY) {
      config.logDirectory = env.MAESTRO_LOG_DIRECTORY;
    }
    if (env.MAESTRO_LOG_ROTATION) {
      config.logRotation = this.parseBoolean(env.MAESTRO_LOG_ROTATION);
    }
    if (env.MAESTRO_MAX_LOG_FILES) {
      config.maxLogFiles = parseInt(env.MAESTRO_MAX_LOG_FILES, 10);
    }
    if (env.MAESTRO_MAX_LOG_SIZE_BYTES) {
      config.maxLogSizeBytes = parseInt(env.MAESTRO_MAX_LOG_SIZE_BYTES, 10);
    }

    // Legacy fields
    if (env.MAESTRO_VERBOSE) {
      config.verbose = this.parseBoolean(env.MAESTRO_VERBOSE);
    }
    if (env.MAESTRO_INTERACTIVE) {
      config.interactive = this.parseBoolean(env.MAESTRO_INTERACTIVE);
    }
    if (env.MAESTRO_SHOW_SPINNER) {
      config.showSpinner = this.parseBoolean(env.MAESTRO_SHOW_SPINNER);
    }

    // Nested configs - Features
    if (env.MAESTRO_FEATURES_SESSION_PERSISTENCE) {
      if (!config.features) {
        config.features = { sessionPersistence: false, analytics: false, contextInjection: true };
      }
      config.features.sessionPersistence = this.parseBoolean(env.MAESTRO_FEATURES_SESSION_PERSISTENCE);
    }
    if (env.MAESTRO_FEATURES_ANALYTICS) {
      if (!config.features) {
        config.features = { sessionPersistence: true, analytics: false, contextInjection: true };
      }
      config.features.analytics = this.parseBoolean(env.MAESTRO_FEATURES_ANALYTICS);
    }
    if (env.MAESTRO_FEATURES_CONTEXT_INJECTION) {
      if (!config.features) {
        config.features = { sessionPersistence: true, analytics: false, contextInjection: true };
      }
      config.features.contextInjection = this.parseBoolean(env.MAESTRO_FEATURES_CONTEXT_INJECTION);
    }

    // Nested configs - UI
    if (env.MAESTRO_UI_SHOW_SPINNER) {
      if (!config.ui) {
        config.ui = { showSpinner: true, statusDisplay: 'enhanced', colors: true };
      }
      config.ui.showSpinner = this.parseBoolean(env.MAESTRO_UI_SHOW_SPINNER);
    }
    if (env.MAESTRO_UI_STATUS_DISPLAY) {
      if (!config.ui) {
        config.ui = { showSpinner: true, statusDisplay: 'enhanced', colors: true };
      }
      config.ui.statusDisplay = env.MAESTRO_UI_STATUS_DISPLAY as 'basic' | 'enhanced';
    }
    if (env.MAESTRO_UI_COLORS) {
      if (!config.ui) {
        config.ui = { showSpinner: true, statusDisplay: 'enhanced', colors: true };
      }
      config.ui.colors = this.parseBoolean(env.MAESTRO_UI_COLORS);
    }

    // Nested configs - Paths
    if (env.MAESTRO_PATHS_LOG_DIRECTORY) {
      if (!config.paths) {
        config.paths = { logDirectory: '', sessionDirectory: '' };
      }
      config.paths.logDirectory = env.MAESTRO_PATHS_LOG_DIRECTORY;
    }
    if (env.MAESTRO_PATHS_SESSION_DIRECTORY) {
      if (!config.paths) {
        config.paths = { logDirectory: '', sessionDirectory: '' };
      }
      config.paths.sessionDirectory = env.MAESTRO_PATHS_SESSION_DIRECTORY;
    }

    return config;
  }

  /**
   * Load configuration from CLI arguments
   */
  static loadFromCLI(args: CLIArgs): Partial<MaestroConfig> {
    const config: Partial<MaestroConfig> = {};

    if (args.planMode !== undefined) {
      config.planMode = args.planMode;
    }
    if (args.verbose !== undefined) {
      config.verbose = args.verbose;
    }
    if (args.interactive !== undefined) {
      config.interactive = args.interactive;
    }
    if (args.logLevel !== undefined) {
      config.logLevel = args.logLevel;
    }
    if (args.timeout !== undefined) {
      config.timeout = args.timeout;
    }
    if (args.enableFileLogging !== undefined) {
      config.enableFileLogging = args.enableFileLogging;
    }
    if (args.showSpinner !== undefined) {
      config.showSpinner = args.showSpinner;
    }
    if (args.theme !== undefined) {
      config.theme = args.theme;
    }
    if (args.autoSave !== undefined) {
      config.autoSave = args.autoSave;
    }

    return config;
  }

  /**
   * Merge multiple configurations with priority
   * Later configs override earlier ones
   */
  static merge(...configs: Partial<MaestroConfig>[]): Partial<MaestroConfig> {
    const merged: any = {};

    for (const config of configs) {
      for (const key in config) {
        const value = (config as any)[key];

        if (value !== undefined && value !== null) {
          if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            // Deep merge for nested objects
            merged[key] = {
              ...(merged[key] || {}),
              ...value
            };
          } else {
            // Simple override for primitives
            merged[key] = value;
          }
        }
      }
    }

    return merged;
  }

  /**
   * Load configuration with full priority chain
   * Priority: CLI > Environment > File > Defaults
   */
  static loadWithPriority(defaults: MaestroConfig, args: CLIArgs = {}, configPath?: string): { config: MaestroConfig; sources: ConfigSource[] } {
    const sources: ConfigSource[] = [];

    // 1. Start with defaults (lowest priority)
    sources.push({ source: 'default', config: defaults });

    // 2. Load from file
    const fileConfig = this.loadFromFile(configPath);
    if (Object.keys(fileConfig).length > 0) {
      sources.push({ source: 'file', config: fileConfig });
    }

    // 3. Load from environment
    const envConfig = this.loadFromEnv();
    if (Object.keys(envConfig).length > 0) {
      sources.push({ source: 'env', config: envConfig });
    }

    // 4. Load from CLI (highest priority)
    const cliConfig = this.loadFromCLI(args);
    if (Object.keys(cliConfig).length > 0) {
      sources.push({ source: 'cli', config: cliConfig });
    }

    // Merge all configs with priority
    const merged = this.merge(
      defaults,
      fileConfig,
      envConfig,
      cliConfig
    );

    return {
      config: merged as MaestroConfig,
      sources
    };
  }

  /**
   * Parse boolean from string
   */
  private static parseBoolean(value: string): boolean {
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Normalize config from file (handle legacy formats)
   */
  private static normalizeConfig(config: any): Partial<MaestroConfig> {
    // Expand tilde in paths
    if (config.logDirectory && typeof config.logDirectory === 'string') {
      config.logDirectory = this.expandPath(config.logDirectory);
    }
    if (config.paths?.logDirectory) {
      config.paths.logDirectory = this.expandPath(config.paths.logDirectory);
    }
    if (config.paths?.sessionDirectory) {
      config.paths.sessionDirectory = this.expandPath(config.paths.sessionDirectory);
    }

    return config;
  }

  /**
   * Expand ~ to home directory in paths
   */
  private static expandPath(path: string): string {
    if (path.startsWith('~/')) {
      return join(homedir(), path.slice(2));
    }
    return path;
  }
}
