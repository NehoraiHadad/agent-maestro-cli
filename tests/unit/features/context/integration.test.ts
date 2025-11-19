/**
 * integration.test.ts
 * Integration tests for context injection with ConfigManager
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ConfigManager } from '../../../../src/features/orchestration/ConfigManager.js';

describe('Context Injection Integration', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  describe('ConfigManager context configuration', () => {
    it('should have context injection enabled by default', () => {
      const features = configManager.get('features');
      expect(features.contextInjection).toBe(true);
    });

    it('should have default context injection config', () => {
      const contextConfig = configManager.get('contextInjection');

      expect(contextConfig).toBeDefined();
      expect(contextConfig?.enabled).toBe(true);
      expect(contextConfig?.includeGit).toBe(true);
      expect(contextConfig?.includeEnv).toBe(true);
      expect(contextConfig?.includeProject).toBe(true);
      expect(contextConfig?.smartSelection).toBe(true);
      expect(contextConfig?.maxRecentCommits).toBe(3);
    });

    it('should allow disabling context injection in features', () => {
      configManager.set('features', {
        sessionPersistence: true,
        analytics: false,
        contextInjection: false
      });

      const features = configManager.get('features');
      expect(features.contextInjection).toBe(false);
    });

    it('should allow customizing context injection config', () => {
      configManager.set('contextInjection', {
        enabled: true,
        includeGit: false,
        includeEnv: true,
        includeProject: true,
        smartSelection: false,
        maxRecentCommits: 5
      });

      const contextConfig = configManager.get('contextInjection');
      expect(contextConfig?.includeGit).toBe(false);
      expect(contextConfig?.smartSelection).toBe(false);
      expect(contextConfig?.maxRecentCommits).toBe(5);
    });

    it('should validate context injection config', () => {
      expect(() => {
        configManager.set('contextInjection', {
          enabled: 'invalid' as any,
          includeGit: true,
          includeEnv: true,
          includeProject: true,
          smartSelection: true,
          maxRecentCommits: 3
        });
      }).toThrow();
    });

    it('should validate maxRecentCommits is non-negative', () => {
      expect(() => {
        configManager.set('contextInjection', {
          enabled: true,
          includeGit: true,
          includeEnv: true,
          includeProject: true,
          smartSelection: true,
          maxRecentCommits: -1
        });
      }).toThrow();
    });

    it('should merge partial context config', () => {
      const original = configManager.get('contextInjection');

      configManager.merge({
        contextInjection: {
          includeGit: false,
          maxRecentCommits: 5
        } as any
      });

      const updated = configManager.get('contextInjection');
      expect(updated?.includeGit).toBe(false);
      expect(updated?.maxRecentCommits).toBe(5);
      // Other fields should remain unchanged
      expect(updated?.enabled).toBe(original?.enabled);
      expect(updated?.includeEnv).toBe(original?.includeEnv);
    });
  });

  describe('Config file compatibility', () => {
    it('should load config with context injection settings', () => {
      const config = new ConfigManager({
        features: {
          sessionPersistence: true,
          analytics: false,
          contextInjection: true
        },
        contextInjection: {
          enabled: true,
          includeGit: true,
          includeEnv: false,
          includeProject: true,
          smartSelection: true,
          maxRecentCommits: 5
        }
      });

      const features = config.get('features');
      const contextConfig = config.get('contextInjection');

      expect(features.contextInjection).toBe(true);
      expect(contextConfig?.enabled).toBe(true);
      expect(contextConfig?.includeEnv).toBe(false);
      expect(contextConfig?.maxRecentCommits).toBe(5);
    });

    it('should work without context injection config', () => {
      const config = new ConfigManager({
        features: {
          sessionPersistence: true,
          analytics: false,
          contextInjection: false
        }
      });

      const features = config.get('features');
      expect(features.contextInjection).toBe(false);

      // Should still have defaults
      const contextConfig = config.get('contextInjection');
      expect(contextConfig).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should pass validation with valid context config', () => {
      const validation = configManager.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation with invalid enabled value', () => {
      expect(() => {
        new ConfigManager({
          contextInjection: {
            enabled: 'yes' as any,
            includeGit: true,
            includeEnv: true,
            includeProject: true,
            smartSelection: true,
            maxRecentCommits: 3
          }
        });
      }).toThrow();
    });

    it('should fail validation with invalid includeGit value', () => {
      expect(() => {
        new ConfigManager({
          contextInjection: {
            enabled: true,
            includeGit: 'yes' as any,
            includeEnv: true,
            includeProject: true,
            smartSelection: true,
            maxRecentCommits: 3
          }
        });
      }).toThrow();
    });

    it('should fail validation with invalid maxRecentCommits', () => {
      expect(() => {
        new ConfigManager({
          contextInjection: {
            enabled: true,
            includeGit: true,
            includeEnv: true,
            includeProject: true,
            smartSelection: true,
            maxRecentCommits: 'invalid' as any
          }
        });
      }).toThrow();
    });
  });

  describe('.maestrorc.json example configurations', () => {
    it('should support minimal config', () => {
      const config = new ConfigManager({
        features: {
          sessionPersistence: true,
          analytics: false,
          contextInjection: true
        }
      });

      expect(config.get('features').contextInjection).toBe(true);
    });

    it('should support fully disabled context injection', () => {
      const config = new ConfigManager({
        features: {
          sessionPersistence: true,
          analytics: false,
          contextInjection: false
        },
        contextInjection: {
          enabled: false,
          includeGit: false,
          includeEnv: false,
          includeProject: false,
          smartSelection: false,
          maxRecentCommits: 0
        }
      });

      const features = config.get('features');
      const contextConfig = config.get('contextInjection');

      expect(features.contextInjection).toBe(false);
      expect(contextConfig?.enabled).toBe(false);
    });

    it('should support custom selective context', () => {
      const config = new ConfigManager({
        features: {
          sessionPersistence: true,
          analytics: false,
          contextInjection: true
        },
        contextInjection: {
          enabled: true,
          includeGit: true,
          includeEnv: false,
          includeProject: true,
          smartSelection: false,
          maxRecentCommits: 5
        }
      });

      const contextConfig = config.get('contextInjection');

      expect(contextConfig?.includeGit).toBe(true);
      expect(contextConfig?.includeEnv).toBe(false);
      expect(contextConfig?.includeProject).toBe(true);
      expect(contextConfig?.smartSelection).toBe(false);
    });
  });
});
