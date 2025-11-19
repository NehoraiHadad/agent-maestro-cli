/**
 * ConfigLoader Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConfigLoader } from '../../../../src/features/config/ConfigLoader.js';
import type { MaestroConfig, CLIArgs } from '../../../../src/features/config/types.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

describe('ConfigLoader', () => {
  const testConfigPath = join(homedir(), '.maestrorc.test.json');
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean up test config file
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Clean up test config file
    if (existsSync(testConfigPath)) {
      unlinkSync(testConfigPath);
    }
    // Reset environment
    process.env = originalEnv;
  });

  describe('loadFromFile', () => {
    it('should return empty config if file does not exist', () => {
      const config = ConfigLoader.loadFromFile('/nonexistent/path');
      expect(config).toEqual({});
    });

    it('should load valid config from file', () => {
      const testConfig = {
        planMode: true,
        logLevel: 'debug',
        theme: 'light'
      };

      writeFileSync(testConfigPath, JSON.stringify(testConfig), 'utf-8');
      const config = ConfigLoader.loadFromFile(testConfigPath);

      expect(config.planMode).toBe(true);
      expect(config.logLevel).toBe('debug');
      expect(config.theme).toBe('light');
    });

    it('should expand ~ in paths', () => {
      const testConfig = {
        logDirectory: '~/.maestro/logs',
        paths: {
          logDirectory: '~/.maestro/logs',
          sessionDirectory: '~/.maestro/sessions'
        }
      };

      writeFileSync(testConfigPath, JSON.stringify(testConfig), 'utf-8');
      const config = ConfigLoader.loadFromFile(testConfigPath);

      expect(config.logDirectory).toContain(homedir());
      expect(config.paths?.logDirectory).toContain(homedir());
      expect(config.paths?.sessionDirectory).toContain(homedir());
    });

    it('should handle malformed JSON gracefully', () => {
      writeFileSync(testConfigPath, '{ invalid json }', 'utf-8');
      const config = ConfigLoader.loadFromFile(testConfigPath);
      expect(config).toEqual({});
    });
  });

  describe('loadFromEnv', () => {
    it('should load core settings from environment', () => {
      process.env.MAESTRO_DEFAULT_MODE = 'plan';
      process.env.MAESTRO_PLAN_MODE = 'true';
      process.env.MAESTRO_THEME = 'dark';
      process.env.MAESTRO_AUTO_SAVE = 'false';
      process.env.MAESTRO_TIMEOUT = '120000';

      const config = ConfigLoader.loadFromEnv();

      expect(config.defaultMode).toBe('plan');
      expect(config.planMode).toBe(true);
      expect(config.theme).toBe('dark');
      expect(config.autoSave).toBe(false);
      expect(config.timeout).toBe(120000);
    });

    it('should load logging settings from environment', () => {
      process.env.MAESTRO_LOG_LEVEL = 'warn';
      process.env.MAESTRO_ENABLE_FILE_LOGGING = 'true';
      process.env.MAESTRO_LOG_DIRECTORY = '/var/logs';
      process.env.MAESTRO_LOG_ROTATION = 'false';
      process.env.MAESTRO_MAX_LOG_FILES = '10';
      process.env.MAESTRO_MAX_LOG_SIZE_BYTES = '2048';

      const config = ConfigLoader.loadFromEnv();

      expect(config.logLevel).toBe('warn');
      expect(config.enableFileLogging).toBe(true);
      expect(config.logDirectory).toBe('/var/logs');
      expect(config.logRotation).toBe(false);
      expect(config.maxLogFiles).toBe(10);
      expect(config.maxLogSizeBytes).toBe(2048);
    });

    it('should load nested configs from environment', () => {
      process.env.MAESTRO_FEATURES_SESSION_PERSISTENCE = 'false';
      process.env.MAESTRO_FEATURES_ANALYTICS = 'true';
      process.env.MAESTRO_UI_SHOW_SPINNER = 'false';
      process.env.MAESTRO_UI_STATUS_DISPLAY = 'basic';
      process.env.MAESTRO_UI_COLORS = 'false';
      process.env.MAESTRO_PATHS_LOG_DIRECTORY = '/custom/logs';
      process.env.MAESTRO_PATHS_SESSION_DIRECTORY = '/custom/sessions';

      const config = ConfigLoader.loadFromEnv();

      expect(config.features?.sessionPersistence).toBe(false);
      expect(config.features?.analytics).toBe(true);
      expect(config.ui?.showSpinner).toBe(false);
      expect(config.ui?.statusDisplay).toBe('basic');
      expect(config.ui?.colors).toBe(false);
      expect(config.paths?.logDirectory).toBe('/custom/logs');
      expect(config.paths?.sessionDirectory).toBe('/custom/sessions');
    });

    it('should parse boolean values correctly', () => {
      process.env.MAESTRO_VERBOSE = 'true';
      process.env.MAESTRO_INTERACTIVE = '1';
      process.env.MAESTRO_SHOW_SPINNER = 'false';

      const config = ConfigLoader.loadFromEnv();

      expect(config.verbose).toBe(true);
      expect(config.interactive).toBe(true);
      expect(config.showSpinner).toBe(false);
    });
  });

  describe('loadFromCLI', () => {
    it('should load config from CLI args', () => {
      const args: CLIArgs = {
        planMode: true,
        verbose: true,
        logLevel: 'debug',
        timeout: 30000,
        theme: 'light',
        autoSave: false
      };

      const config = ConfigLoader.loadFromCLI(args);

      expect(config.planMode).toBe(true);
      expect(config.verbose).toBe(true);
      expect(config.logLevel).toBe('debug');
      expect(config.timeout).toBe(30000);
      expect(config.theme).toBe('light');
      expect(config.autoSave).toBe(false);
    });

    it('should ignore undefined CLI args', () => {
      const args: CLIArgs = {
        planMode: true,
        verbose: undefined,
        logLevel: undefined
      };

      const config = ConfigLoader.loadFromCLI(args);

      expect(config.planMode).toBe(true);
      expect(config.verbose).toBeUndefined();
      expect(config.logLevel).toBeUndefined();
    });
  });

  describe('merge', () => {
    it('should merge multiple configs', () => {
      const config1: Partial<MaestroConfig> = {
        planMode: false,
        logLevel: 'info'
      };

      const config2: Partial<MaestroConfig> = {
        planMode: true,
        theme: 'dark'
      };

      const config3: Partial<MaestroConfig> = {
        timeout: 60000
      };

      const merged = ConfigLoader.merge(config1, config2, config3);

      expect(merged.planMode).toBe(true); // Overridden by config2
      expect(merged.logLevel).toBe('info'); // From config1
      expect(merged.theme).toBe('dark'); // From config2
      expect(merged.timeout).toBe(60000); // From config3
    });

    it('should deep merge nested objects', () => {
      const config1: Partial<MaestroConfig> = {
        features: {
          sessionPersistence: true,
          analytics: false
        }
      };

      const config2: Partial<MaestroConfig> = {
        features: {
          analytics: true
        } as any
      };

      const merged = ConfigLoader.merge(config1, config2);

      expect(merged.features?.sessionPersistence).toBe(true);
      expect(merged.features?.analytics).toBe(true);
    });

    it('should handle null and undefined values', () => {
      const config1: Partial<MaestroConfig> = {
        planMode: false,
        logLevel: 'info'
      };

      const config2: any = {
        planMode: true,
        logLevel: undefined,
        theme: null
      };

      const merged = ConfigLoader.merge(config1, config2);

      expect(merged.planMode).toBe(true);
      expect(merged.logLevel).toBe('info'); // Should not override with undefined
    });
  });

  describe('loadWithPriority', () => {
    it('should apply correct priority: CLI > env > file > defaults', () => {
      // Create file config
      const fileConfig = {
        planMode: false,
        logLevel: 'info',
        theme: 'light'
      };
      writeFileSync(testConfigPath, JSON.stringify(fileConfig), 'utf-8');

      // Set env config
      process.env.MAESTRO_PLAN_MODE = 'true';
      process.env.MAESTRO_LOG_LEVEL = 'warn';

      // Set CLI config
      const cliArgs: CLIArgs = {
        planMode: false
      };

      const defaults: MaestroConfig = {
        defaultMode: 'interactive',
        planMode: false,
        theme: 'dark',
        autoSave: true,
        timeout: 60000,
        inactivityTimeout: 300000,
        showSpinner: true,
        verbose: false,
        interactive: false,
        enableFileLogging: true,
        logLevel: 'info',
        logDirectory: '/tmp',
        logRotation: true,
        maxLogFiles: 5,
        maxLogSizeBytes: 10485760,
        features: {
          sessionPersistence: true,
          analytics: false
        },
        ui: {
          showSpinner: true,
          statusDisplay: 'enhanced',
          colors: true
        },
        paths: {
          logDirectory: '/tmp',
          sessionDirectory: '/tmp'
        }
      };

      const { config, sources } = ConfigLoader.loadWithPriority(defaults, cliArgs, testConfigPath);

      // CLI should override env and file
      expect(config.planMode).toBe(false); // CLI wins

      // Env should override file
      expect(config.logLevel).toBe('warn'); // Env wins

      // File should override defaults
      expect(config.theme).toBe('light'); // File wins

      // Should have all sources
      expect(sources.length).toBeGreaterThanOrEqual(2);
      expect(sources.some(s => s.source === 'default')).toBe(true);
      expect(sources.some(s => s.source === 'file')).toBe(true);
    });

    it('should work with defaults only', () => {
      const defaults: MaestroConfig = {
        defaultMode: 'interactive',
        planMode: false,
        theme: 'dark',
        autoSave: true,
        timeout: 60000,
        inactivityTimeout: 300000,
        showSpinner: true,
        verbose: false,
        interactive: false,
        enableFileLogging: true,
        logLevel: 'info',
        logDirectory: '/tmp',
        logRotation: true,
        maxLogFiles: 5,
        maxLogSizeBytes: 10485760,
        features: {
          sessionPersistence: true,
          analytics: false
        },
        ui: {
          showSpinner: true,
          statusDisplay: 'enhanced',
          colors: true
        },
        paths: {
          logDirectory: '/tmp',
          sessionDirectory: '/tmp'
        }
      };

      const { config, sources } = ConfigLoader.loadWithPriority(defaults);

      expect(config.planMode).toBe(false);
      expect(config.theme).toBe('dark');
      expect(sources.length).toBe(1);
      expect(sources[0].source).toBe('default');
    });
  });
});
