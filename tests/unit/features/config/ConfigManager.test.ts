/**
 * ConfigManager Tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConfigManager } from '../../../../src/features/orchestration/ConfigManager.js';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

describe('ConfigManager', () => {
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

  describe('constructor', () => {
    it('should create ConfigManager with defaults', () => {
      const manager = new ConfigManager();
      const config = manager.getAll();

      expect(config.planMode).toBe(false);
      expect(config.defaultMode).toBe('interactive');
      expect(config.theme).toBe('dark');
      expect(config.autoSave).toBe(true);
      expect(config.features.sessionPersistence).toBe(true);
      expect(config.ui.showSpinner).toBe(true);
    });

    it('should merge partial config with defaults', () => {
      const manager = new ConfigManager({
        planMode: true,
        logLevel: 'debug'
      });

      const config = manager.getAll();
      expect(config.planMode).toBe(true);
      expect(config.logLevel).toBe('debug');
      expect(config.theme).toBe('dark'); // Default
    });

    it('should throw error for invalid config', () => {
      expect(() => {
        new ConfigManager({
          planMode: 'invalid' as any
        });
      }).toThrow();
    });
  });

  describe('get and set', () => {
    it('should get configuration values', () => {
      const manager = new ConfigManager();

      expect(manager.get('planMode')).toBe(false);
      expect(manager.get('logLevel')).toBe('info');
    });

    it('should set configuration values', () => {
      const manager = new ConfigManager();

      manager.set('planMode', true);
      expect(manager.get('planMode')).toBe(true);

      manager.set('logLevel', 'debug');
      expect(manager.get('logLevel')).toBe('debug');
    });

    it('should validate after setting values', () => {
      const manager = new ConfigManager();

      expect(() => {
        manager.set('logLevel', 'invalid' as any);
      }).toThrow();
    });
  });

  describe('getAll', () => {
    it('should return all configuration', () => {
      const manager = new ConfigManager();
      const config = manager.getAll();

      expect(config).toHaveProperty('planMode');
      expect(config).toHaveProperty('logLevel');
      expect(config).toHaveProperty('features');
      expect(config).toHaveProperty('ui');
      expect(config).toHaveProperty('paths');
    });

    it('should return a copy of configuration', () => {
      const manager = new ConfigManager();
      const config1 = manager.getAll();
      const config2 = manager.getAll();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('merge', () => {
    it('should merge partial config', () => {
      const manager = new ConfigManager();

      manager.merge({
        planMode: true,
        theme: 'light'
      });

      expect(manager.get('planMode')).toBe(true);
      expect(manager.get('theme')).toBe('light');
      expect(manager.get('logLevel')).toBe('info'); // Unchanged
    });

    it('should deep merge nested objects', () => {
      const manager = new ConfigManager();

      manager.merge({
        features: {
          analytics: true
        } as any
      });

      const features = manager.get('features');
      expect(features.sessionPersistence).toBe(true); // Unchanged
      expect(features.analytics).toBe(true); // Updated
    });

    it('should validate after merge', () => {
      const manager = new ConfigManager();

      expect(() => {
        manager.merge({
          planMode: 'invalid' as any
        });
      }).toThrow();
    });
  });

  describe('save and load', () => {
    it('should save configuration to file', () => {
      const manager = new ConfigManager({
        planMode: true,
        logLevel: 'debug'
      });

      manager.save(testConfigPath);

      expect(existsSync(testConfigPath)).toBe(true);

      const content = readFileSync(testConfigPath, 'utf-8');
      const config = JSON.parse(content);

      expect(config.planMode).toBe(true);
      expect(config.logLevel).toBe('debug');
    });

    it('should load configuration from file', () => {
      const fileConfig = {
        planMode: true,
        logLevel: 'warn',
        theme: 'light'
      };

      writeFileSync(testConfigPath, JSON.stringify(fileConfig), 'utf-8');

      const manager = new ConfigManager();
      manager.load(testConfigPath);

      expect(manager.get('planMode')).toBe(true);
      expect(manager.get('logLevel')).toBe('warn');
      expect(manager.get('theme')).toBe('light');
    });

    it('should not fail if file does not exist', () => {
      const manager = new ConfigManager();

      expect(() => {
        manager.load('/nonexistent/path');
      }).not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset configuration to defaults', () => {
      const manager = new ConfigManager({
        planMode: true,
        logLevel: 'debug',
        theme: 'light'
      });

      expect(manager.get('planMode')).toBe(true);
      expect(manager.get('logLevel')).toBe('debug');
      expect(manager.get('theme')).toBe('light');

      manager.reset();

      expect(manager.get('planMode')).toBe(false);
      expect(manager.get('logLevel')).toBe('info');
      expect(manager.get('theme')).toBe('dark');
    });
  });

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const manager = new ConfigManager();
      const validation = manager.validate();

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid planMode', () => {
      const manager = new ConfigManager();
      (manager as any).config.planMode = 'invalid';

      const validation = manager.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('planMode'))).toBe(true);
    });

    it('should detect invalid logLevel', () => {
      const manager = new ConfigManager();
      (manager as any).config.logLevel = 'invalid';

      const validation = manager.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('logLevel'))).toBe(true);
    });

    it('should detect invalid theme', () => {
      const manager = new ConfigManager();
      (manager as any).config.theme = 'invalid';

      const validation = manager.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('theme'))).toBe(true);
    });

    it('should detect invalid timeout', () => {
      const manager = new ConfigManager();
      (manager as any).config.timeout = -1;

      const validation = manager.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('timeout'))).toBe(true);
    });

    it('should detect invalid nested config', () => {
      const manager = new ConfigManager();
      (manager as any).config.ui.statusDisplay = 'invalid';

      const validation = manager.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('ui.statusDisplay'))).toBe(true);
    });
  });

  describe('loadWithPriority', () => {
    it('should load config with priority', () => {
      // Create file config
      const fileConfig = {
        planMode: false,
        logLevel: 'warn'
      };
      writeFileSync(testConfigPath, JSON.stringify(fileConfig), 'utf-8');

      // Set env config
      process.env.MAESTRO_PLAN_MODE = 'true';

      const manager = ConfigManager.loadWithPriority({}, testConfigPath);

      // Env should override file
      expect(manager.get('planMode')).toBe(true);
      expect(manager.get('logLevel')).toBe('warn');
    });

    it('should work with CLI args', () => {
      const manager = ConfigManager.loadWithPriority({
        planMode: true,
        verbose: true
      });

      expect(manager.get('planMode')).toBe(true);
      expect(manager.get('verbose')).toBe(true);
    });
  });

  describe('getDefaults', () => {
    it('should return default configuration', () => {
      const defaults = ConfigManager.getDefaults();

      expect(defaults.defaultMode).toBe('interactive');
      expect(defaults.planMode).toBe(false);
      expect(defaults.theme).toBe('dark');
      expect(defaults.autoSave).toBe(true);
      expect(defaults.features.sessionPersistence).toBe(true);
      expect(defaults.features.analytics).toBe(false);
      expect(defaults.ui.showSpinner).toBe(true);
      expect(defaults.ui.statusDisplay).toBe('enhanced');
      expect(defaults.ui.colors).toBe(true);
    });

    it('should return a new object each time', () => {
      const defaults1 = ConfigManager.getDefaults();
      const defaults2 = ConfigManager.getDefaults();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });
  });
});
