/**
 * ConfigManager.ts
 * Manages Maestro configuration and validation
 */

import {
  DEFAULT_INACTIVITY_TIMEOUT,
  DEFAULT_MAX_DELEGATION_DEPTH
} from '../../shared/constants/index.js';

export interface MaestroConfig {
  inactivityTimeout: number;
  maxDelegationDepth: number;
  showSpinner: boolean;
  verbose: boolean;
  includeDelegationPrompt: boolean;  // Include delegation system prompt in agent prompts
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

    if (this.config.maxDelegationDepth < 1 || this.config.maxDelegationDepth > 10) {
      errors.push('maxDelegationDepth must be between 1 and 10');
    }

    if (typeof this.config.showSpinner !== 'boolean') {
      errors.push('showSpinner must be a boolean');
    }

    if (typeof this.config.verbose !== 'boolean') {
      errors.push('verbose must be a boolean');
    }

    if (typeof this.config.includeDelegationPrompt !== 'boolean') {
      errors.push('includeDelegationPrompt must be a boolean');
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
      maxDelegationDepth: DEFAULT_MAX_DELEGATION_DEPTH,
      showSpinner: true,
      verbose: false,
      includeDelegationPrompt: true  // Enable delegation prompt by default
    };
  }
}
