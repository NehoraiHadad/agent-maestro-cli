/**
 * Configuration Types
 * Defines all configuration interfaces and types for AgentMaestro
 */

import type { LogLevel } from '../../shared/constants/index.js';
import type { StatusDisplayConfig } from '../../shared/types/ui.types.js';

export interface UIConfig {
  showSpinner: boolean;
  statusDisplay: 'basic' | 'enhanced';
  colors: boolean;
}

export interface FeaturesConfig {
  sessionPersistence: boolean;
  analytics: boolean;
  contextInjection: boolean;
}

export interface ContextInjectionConfig {
  enabled: boolean;
  includeGit: boolean;
  includeEnv: boolean;
  includeProject: boolean;
  smartSelection: boolean;
  maxRecentCommits: number;
}

export interface PathsConfig {
  logDirectory: string;
  sessionDirectory: string;
}

export interface MaestroConfig {
  // Core settings
  defaultMode: 'interactive' | 'plan';
  planMode: boolean;
  theme: 'dark' | 'light';
  autoSave: boolean;
  timeout: number;

  // Logging configuration
  logLevel: LogLevel;
  enableFileLogging: boolean;
  logDirectory: string;
  logRotation: boolean;
  maxLogFiles: number;
  maxLogSizeBytes: number;

  // Features
  features: FeaturesConfig;

  // UI settings
  ui: UIConfig;

  // Paths
  paths: PathsConfig;

  // Status display configuration (from TASK-010)
  statusDisplay?: StatusDisplayConfig;

  // Context injection configuration (from TASK-014)
  contextInjection?: ContextInjectionConfig;

  // Legacy/compatibility fields
  inactivityTimeout: number;
  showSpinner: boolean;
  verbose: boolean;
  interactive: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ConfigSource {
  source: 'default' | 'file' | 'env' | 'cli';
  config: Partial<MaestroConfig>;
}

export interface CLIArgs {
  planMode?: boolean;
  verbose?: boolean;
  interactive?: boolean;
  logLevel?: LogLevel;
  timeout?: number;
  enableFileLogging?: boolean;
  showSpinner?: boolean;
  theme?: 'dark' | 'light';
  autoSave?: boolean;
}
