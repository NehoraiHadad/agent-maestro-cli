import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigManager } from '../../src/features/orchestration/ConfigManager.js';
import { ConfigValidationError } from '../../src/shared/errors/index.js';

describe('ConfigManager', () => {
  describe('Constructor', () => {
    it('should create with default configuration', () => {
      const config = new ConfigManager();
      const defaults = ConfigManager.getDefaults();

      expect(config.get('inactivityTimeout')).toBe(defaults.inactivityTimeout);
      expect(config.get('showSpinner')).toBe(defaults.showSpinner);
      expect(config.get('verbose')).toBe(defaults.verbose);
    });

    it('should accept partial configuration', () => {
      const config = new ConfigManager({
        verbose: true,
        showSpinner: false
      });

      expect(config.get('verbose')).toBe(true);
      expect(config.get('showSpinner')).toBe(false);
    });

    it('should throw on invalid configuration', () => {
      expect(() => {
        new ConfigManager({ inactivityTimeout: -1000 });
      }).toThrow(ConfigValidationError);
    });
  });

  describe('Validation', () => {
    it('should accept valid configuration', () => {
      const config = new ConfigManager({
        verbose: true,
        showSpinner: false,
        inactivityTimeout: 30000,
        logDirectory: './logs'
      });

      const result = config.validate();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative inactivity timeout', () => {
      expect(() => {
        new ConfigManager({ inactivityTimeout: -1000 });
      }).toThrow(/inactivityTimeout must be greater than 0/);
    });

    it('should reject zero timeout', () => {
      expect(() => {
        new ConfigManager({ inactivityTimeout: 0 });
      }).toThrow(/inactivityTimeout must be greater than 0/);
    });

    it('should reject empty log directory', () => {
      expect(() => {
        new ConfigManager({ logDirectory: '' });
      }).toThrow(/logDirectory must be a non-empty string/);
    });

    it('should reject non-string log directory', () => {
      expect(() => {
        new ConfigManager({ logDirectory: 123 as any });
      }).toThrow(/logDirectory must be a non-empty string/);
    });

    it('should reject non-boolean showSpinner', () => {
      expect(() => {
        new ConfigManager({ showSpinner: 'true' as any });
      }).toThrow(/showSpinner must be a boolean/);
    });

    it('should reject non-boolean verbose', () => {
      expect(() => {
        new ConfigManager({ verbose: 1 as any });
      }).toThrow(/verbose must be a boolean/);
    });

    it('should reject non-boolean planMode', () => {
      expect(() => {
        new ConfigManager({ planMode: 'false' as any });
      }).toThrow(/planMode must be a boolean/);
    });

    it('should reject invalid log level', () => {
      expect(() => {
        new ConfigManager({ logLevel: 'invalid' as any });
      }).toThrow(/logLevel must be one of/);
    });

    it('should accept valid log levels', () => {
      const levels = ['debug', 'info', 'warn', 'error'] as const;

      levels.forEach(level => {
        expect(() => {
          new ConfigManager({ logLevel: level });
        }).not.toThrow();
      });
    });

    it('should reject maxLogFiles less than 1', () => {
      expect(() => {
        new ConfigManager({ maxLogFiles: 0 });
      }).toThrow(/maxLogFiles must be at least 1/);
    });

    it('should reject maxLogSizeBytes less than 1024', () => {
      expect(() => {
        new ConfigManager({ maxLogSizeBytes: 512 });
      }).toThrow(/maxLogSizeBytes must be at least 1024 bytes/);
    });
  });

  describe('Get/Set', () => {
    let config: ConfigManager;

    beforeEach(() => {
      config = new ConfigManager({ verbose: false });
    });

    it('should get configuration value', () => {
      expect(config.get('verbose')).toBe(false);
    });

    it('should set configuration value', () => {
      config.set('verbose', true);
      expect(config.get('verbose')).toBe(true);
    });

    it('should get all configuration', () => {
      const all = config.getAll();
      expect(all).toHaveProperty('verbose');
      expect(all).toHaveProperty('showSpinner');
      expect(all).toHaveProperty('inactivityTimeout');
    });

    it('should return copy of configuration', () => {
      const all1 = config.getAll();
      const all2 = config.getAll();
      expect(all1).not.toBe(all2);
      expect(all1).toEqual(all2);
    });
  });

  describe('Defaults', () => {
    it('should return default configuration', () => {
      const defaults = ConfigManager.getDefaults();

      expect(defaults).toHaveProperty('inactivityTimeout');
      expect(defaults).toHaveProperty('showSpinner');
      expect(defaults).toHaveProperty('verbose');
      expect(defaults).toHaveProperty('planMode');
      expect(defaults).toHaveProperty('enableFileLogging');
      expect(defaults).toHaveProperty('logLevel');
      expect(defaults).toHaveProperty('logDirectory');
    });

    it('should have sensible default values', () => {
      const defaults = ConfigManager.getDefaults();

      expect(defaults.inactivityTimeout).toBeGreaterThan(0);
      expect(typeof defaults.showSpinner).toBe('boolean');
      expect(typeof defaults.verbose).toBe('boolean');
      expect(['debug', 'info', 'warn', 'error']).toContain(defaults.logLevel);
      expect(defaults.logDirectory).toBeTruthy();
    });
  });
});
