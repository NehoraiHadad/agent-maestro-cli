/**
 * ConfigManager.ts
 * Manages Maestro configuration and validation
 */

import {
  DEFAULT_INACTIVITY_TIMEOUT,
  DEFAULT_LOG_DIRECTORY,
  DEFAULT_LOG_LEVEL,
  DEFAULT_MAX_LOG_FILES,
  DEFAULT_MAX_LOG_SIZE_BYTES,
  DEFAULT_ENABLE_FILE_LOGGING,
  DEFAULT_LOG_ROTATION,
  type LogLevel
} from '../../shared/constants/index.js';
import { ConfigValidationError } from '../../shared/errors/index.js';

export interface MaestroConfig {
  inactivityTimeout: number;
  showSpinner: boolean;
  verbose: boolean;
  planMode: boolean;
  interactive: boolean; // Whether this is an interactive session (enables session continuation)

  // Logging configuration
  enableFileLogging: boolean;
  logLevel: LogLevel;
  logDirectory: string;
  logRotation: boolean;
  maxLogFiles: number;
  maxLogSizeBytes: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Manages configuration for Maestro orchestrator
 */
export class ConfigManager {
  private config: MaestroConfig;

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
      throw new ConfigValidationError(validation.errors);
    }
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
  }

  /**
   * Get all configuration values
   * @returns Complete configuration object
   */
  getAll(): MaestroConfig {
    return { ...this.config };
  }

  /**
   * Validate current configuration
   * @returns Validation result with errors if any
   */
  validate(): ValidationResult {
    const errors: string[] = [];

    if (this.config.inactivityTimeout <= 0) {
      errors.push('inactivityTimeout must be greater than 0');
    }

    if (typeof this.config.showSpinner !== 'boolean') {
      errors.push('showSpinner must be a boolean');
    }

    if (typeof this.config.verbose !== 'boolean') {
      errors.push('verbose must be a boolean');
    }

    if (typeof this.config.planMode !== 'boolean') {
      errors.push('planMode must be a boolean');
    }

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
      inactivityTimeout: DEFAULT_INACTIVITY_TIMEOUT,
      showSpinner: true,
      verbose: false,
      planMode: false,
      interactive: false, // Default to non-interactive (one-shot mode)

      // Logging defaults
      enableFileLogging: DEFAULT_ENABLE_FILE_LOGGING,
      logLevel: DEFAULT_LOG_LEVEL,
      logDirectory: DEFAULT_LOG_DIRECTORY,
      logRotation: DEFAULT_LOG_ROTATION,
      maxLogFiles: DEFAULT_MAX_LOG_FILES,
      maxLogSizeBytes: DEFAULT_MAX_LOG_SIZE_BYTES
    };
  }
}
