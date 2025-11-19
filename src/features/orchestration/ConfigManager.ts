/**
 * ConfigManager.ts
 * Manages Maestro configuration and validation
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import {
  DEFAULT_INACTIVITY_TIMEOUT,
  DEFAULT_LOG_DIRECTORY,
  DEFAULT_LOG_LEVEL,
  DEFAULT_MAX_LOG_FILES,
  DEFAULT_MAX_LOG_SIZE_BYTES,
  DEFAULT_ENABLE_FILE_LOGGING,
  DEFAULT_LOG_ROTATION
} from '../../shared/constants/index.js';
import { MaestroError } from '../../shared/errors/index.js';
import { ConfigLoader } from '../config/ConfigLoader.js';
import type { MaestroConfig, ValidationResult, CLIArgs } from '../config/types.js';

// Re-export types for backward compatibility
export type { MaestroConfig, ValidationResult };

/**
 * Manages configuration for Maestro orchestrator
 */
export class ConfigManager {
  private config: MaestroConfig;
  private static readonly CONFIG_FILE_NAME = '.maestrorc.json';

  /**
   * Create a new ConfigManager
   * @param config - Partial configuration to override defaults
   */
  constructor(config?: Partial<MaestroConfig>) {
    this.config = {
      ...ConfigManager.getDefaults(),
      ...config
    };

    // Validate configuration immediately
    const validation = this.validate();
    if (!validation.valid) {
      throw new MaestroError(
        `Configuration validation failed: ${validation.errors.join(', ')}`,
        'CONFIG_VALIDATION_ERROR',
        { errors: validation.errors }
      );
    }
  }

  /**
   * Create ConfigManager with full priority loading
   * @param args - CLI arguments
   * @param configPath - Optional custom config file path
   * @returns ConfigManager instance
   */
  static loadWithPriority(args: CLIArgs = {}, configPath?: string): ConfigManager {
    const defaults = ConfigManager.getDefaults();
    const { config } = ConfigLoader.loadWithPriority(defaults, args, configPath);
    return new ConfigManager(config);
  }

  /**
   * Get a configuration value
   * @param key - Configuration key
   * @returns Configuration value
   */
  get<K extends keyof MaestroConfig>(key: K): MaestroConfig[K] {
    return this.config[key];
  }

  /**
   * Set a configuration value
   * @param key - Configuration key
   * @param value - Configuration value
   */
  set<K extends keyof MaestroConfig>(key: K, value: MaestroConfig[K]): void {
    this.config[key] = value;

    // Validate after setting
    const validation = this.validate();
    if (!validation.valid) {
      throw new MaestroError(
        `Invalid configuration value: ${validation.errors.join(', ')}`,
        'CONFIG_VALIDATION_ERROR',
        { errors: validation.errors }
      );
    }
  }

  /**
   * Get all configuration values
   * @returns Complete configuration object
   */
  getAll(): MaestroConfig {
    return { ...this.config };
  }

  /**
   * Merge partial configuration into current config
   * @param config - Partial configuration to merge
   */
  merge(config: Partial<MaestroConfig>): void {
    this.config = ConfigLoader.merge(this.config, config) as MaestroConfig;

    // Validate after merging
    const validation = this.validate();
    if (!validation.valid) {
      throw new MaestroError(
        `Configuration validation failed after merge: ${validation.errors.join(', ')}`,
        'CONFIG_VALIDATION_ERROR',
        { errors: validation.errors }
      );
    }
  }

  /**
   * Load configuration from file
   * @param path - Optional custom config file path
   */
  load(path?: string): void {
    const configPath = path || join(homedir(), ConfigManager.CONFIG_FILE_NAME);
    const fileConfig = ConfigLoader.loadFromFile(configPath);

    if (Object.keys(fileConfig).length > 0) {
      this.merge(fileConfig);
    }
  }

  /**
   * Save current configuration to file
   * @param path - Optional custom config file path
   */
  save(path?: string): void {
    const configPath = path || join(homedir(), ConfigManager.CONFIG_FILE_NAME);

    // Ensure directory exists
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Create a clean config object (remove undefined values)
    const cleanConfig = this.getCleanConfig();

    try {
      writeFileSync(configPath, JSON.stringify(cleanConfig, null, 2), 'utf-8');
    } catch (error) {
      throw new MaestroError(
        `Failed to save configuration to ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
        'CONFIG_SAVE_ERROR',
        { path: configPath }
      );
    }
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = ConfigManager.getDefaults();
  }

  /**
   * Get a clean config object without undefined values
   */
  private getCleanConfig(): any {
    const clean: any = {};

    for (const key in this.config) {
      const value = (this.config as any)[key];
      if (value !== undefined) {
        if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
          // Recursively clean nested objects
          clean[key] = {};
          for (const nestedKey in value) {
            if (value[nestedKey] !== undefined) {
              clean[key][nestedKey] = value[nestedKey];
            }
          }
        } else {
          clean[key] = value;
        }
      }
    }

    return clean;
  }

  /**
   * Validate current configuration
   * @returns Validation result with errors if any
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    // Core settings validation
    if (this.config.defaultMode && !['interactive', 'plan'].includes(this.config.defaultMode)) {
      errors.push('defaultMode must be "interactive" or "plan"');
    }

    if (typeof this.config.planMode !== 'boolean') {
      errors.push('planMode must be a boolean');
    }

    if (this.config.theme && !['dark', 'light'].includes(this.config.theme)) {
      errors.push('theme must be "dark" or "light"');
    }

    if (typeof this.config.autoSave !== 'boolean') {
      errors.push('autoSave must be a boolean');
    }

    if (this.config.timeout !== undefined && this.config.timeout <= 0) {
      errors.push('timeout must be greater than 0');
    }

    // Legacy fields
    if (this.config.inactivityTimeout !== undefined && this.config.inactivityTimeout <= 0) {
      errors.push('inactivityTimeout must be greater than 0');
    }

    if (typeof this.config.showSpinner !== 'boolean') {
      errors.push('showSpinner must be a boolean');
    }

    if (typeof this.config.verbose !== 'boolean') {
      errors.push('verbose must be a boolean');
    }

    // Logging validation
    if (typeof this.config.enableFileLogging !== 'boolean') {
      errors.push('enableFileLogging must be a boolean');
    }

    if (!['debug', 'info', 'warn', 'error'].includes(this.config.logLevel)) {
      errors.push('logLevel must be one of: debug, info, warn, error');
    }

    if (typeof this.config.logDirectory !== 'string' || !this.config.logDirectory) {
      errors.push('logDirectory must be a non-empty string');
    }

    if (typeof this.config.logRotation !== 'boolean') {
      errors.push('logRotation must be a boolean');
    }

    if (this.config.maxLogFiles < 1) {
      errors.push('maxLogFiles must be at least 1');
    }

    if (this.config.maxLogSizeBytes < 1024) {
      errors.push('maxLogSizeBytes must be at least 1024 bytes');
    }

    // Features validation
    if (this.config.features) {
      if (typeof this.config.features.sessionPersistence !== 'boolean') {
        errors.push('features.sessionPersistence must be a boolean');
      }
      if (typeof this.config.features.analytics !== 'boolean') {
        errors.push('features.analytics must be a boolean');
      }
    }

    // UI validation
    if (this.config.ui) {
      if (typeof this.config.ui.showSpinner !== 'boolean') {
        errors.push('ui.showSpinner must be a boolean');
      }
      if (this.config.ui.statusDisplay && !['basic', 'enhanced'].includes(this.config.ui.statusDisplay)) {
        errors.push('ui.statusDisplay must be "basic" or "enhanced"');
      }
      if (typeof this.config.ui.colors !== 'boolean') {
        errors.push('ui.colors must be a boolean');
      }
    }

    // Paths validation
    if (this.config.paths) {
      if (typeof this.config.paths.logDirectory !== 'string' || !this.config.paths.logDirectory) {
        errors.push('paths.logDirectory must be a non-empty string');
      }
      if (typeof this.config.paths.sessionDirectory !== 'string' || !this.config.paths.sessionDirectory) {
        errors.push('paths.sessionDirectory must be a non-empty string');
      }
    }

    // Status display validation (optional field from TASK-010)
    if (this.config.statusDisplay) {
      if (typeof this.config.statusDisplay.enabled !== 'boolean') {
        errors.push('statusDisplay.enabled must be a boolean');
      }
      if (typeof this.config.statusDisplay.showHeader !== 'boolean') {
        errors.push('statusDisplay.showHeader must be a boolean');
      }
      if (typeof this.config.statusDisplay.showProgress !== 'boolean') {
        errors.push('statusDisplay.showProgress must be a boolean');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get default configuration
   * @returns Default Maestro configuration
   */
  static getDefaults(): MaestroConfig {
    return {
      // Core settings
      defaultMode: 'interactive',
      planMode: false,
      theme: 'dark',
      autoSave: true,
      timeout: 60000,

      // Legacy fields
      inactivityTimeout: DEFAULT_INACTIVITY_TIMEOUT,
      showSpinner: true,
      verbose: false,
      interactive: false, // Default to non-interactive (one-shot mode)

      // Logging defaults
      enableFileLogging: DEFAULT_ENABLE_FILE_LOGGING,
      logLevel: DEFAULT_LOG_LEVEL,
      logDirectory: DEFAULT_LOG_DIRECTORY,
      logRotation: DEFAULT_LOG_ROTATION,
      maxLogFiles: DEFAULT_MAX_LOG_FILES,
      maxLogSizeBytes: DEFAULT_MAX_LOG_SIZE_BYTES,

      // Features
      features: {
        sessionPersistence: true,
        analytics: false
      },

      // UI settings
      ui: {
        showSpinner: true,
        statusDisplay: 'enhanced',
        colors: true
      },

      // Paths
      paths: {
        logDirectory: DEFAULT_LOG_DIRECTORY,
        sessionDirectory: join(homedir(), '.maestro', 'sessions')
      },

      // Status display defaults (from TASK-010)
      statusDisplay: {
        enabled: true,
        showHeader: true,
        showProgress: true,
        headerWidth: 60,
        theme: {
          borderColor: 'cyan',
          headerColor: 'magenta',
          accentColor: 'cyan',
          labelColor: 'gray',
          valueColor: 'white',
          progressBarFilled: '█',
          progressBarEmpty: '░',
          progressBarColor: 'cyan'
        }
      }
    };
  }
}
