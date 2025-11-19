/**
 * CommandPalette Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { CommandPalette } from '../../../../src/features/ui/CommandPalette.js';
import { Maestro } from '../../../../src/features/orchestration/Maestro.js';
import { ConsoleLogger } from '../../../../src/features/ui/logger/ConsoleLogger.js';
import type { PaletteAction } from '../../../../src/features/ui/CommandPalette.js';

// Mock dependencies
jest.mock('inquirer');

describe('CommandPalette', () => {
  let palette: CommandPalette;
  let maestro: Maestro;
  let logger: ConsoleLogger;

  beforeEach(() => {
    // Create mock maestro
    maestro = {
      getStats: jest.fn().mockReturnValue({
        totalMessages: 10,
        sessionDuration: 60000,
        userMessages: 5,
        assistantMessages: 5,
        delegationMessages: 0,
        startTime: new Date()
      }),
      isPlanMode: jest.fn().mockReturnValue(false),
      getConfigManager: jest.fn().mockReturnValue({
        getAll: jest.fn().mockReturnValue({
          planMode: false,
          theme: 'dark',
          autoSave: true,
          logLevel: 'info',
          ui: {
            showSpinner: true,
            statusDisplay: 'enhanced',
            colors: true
          },
          features: {
            sessionPersistence: true,
            analytics: false
          }
        }),
        set: jest.fn(),
        merge: jest.fn(),
        save: jest.fn(),
        reset: jest.fn()
      }),
      exportSession: jest.fn().mockReturnValue({
        sessionId: 'test-session-id',
        startTime: new Date(),
        messages: [],
        summary: {
          sessionId: 'test-session-id',
          startTime: new Date(),
          messageCount: 10,
          userMessages: 5,
          assistantMessages: 5,
          delegationMessages: 0,
          duration: 60000
        }
      }),
      resetSession: jest.fn()
    } as any;

    logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      success: jest.fn(),
      separator: jest.fn(),
      header: jest.fn()
    } as any;

    palette = new CommandPalette(maestro, logger);
  });

  describe('constructor', () => {
    it('should initialize with default actions', () => {
      const actions = palette.getActions();

      expect(actions.length).toBeGreaterThan(0);
      expect(actions.some(a => a.id === 'load-session')).toBe(true);
      expect(actions.some(a => a.id === 'save-session')).toBe(true);
      expect(actions.some(a => a.id === 'reset-session')).toBe(true);
      expect(actions.some(a => a.id === 'settings')).toBe(true);
      expect(actions.some(a => a.id === 'statistics')).toBe(true);
    });

    it('should create palette without logger', () => {
      const paletteWithoutLogger = new CommandPalette(maestro);
      expect(paletteWithoutLogger).toBeDefined();
    });
  });

  describe('registerAction', () => {
    it('should register a custom action', async () => {
      const customAction: PaletteAction = {
        id: 'custom',
        name: 'Custom Action',
        description: 'A custom action',
        icon: '🎨',
        execute: async () => {}
      };

      palette.registerAction(customAction);
      const actions = palette.getActions();

      expect(actions.some(a => a.id === 'custom')).toBe(true);
    });

    it('should override existing action with same id', async () => {
      const originalAction: PaletteAction = {
        id: 'test',
        name: 'Original',
        description: 'Original action',
        icon: '📝',
        execute: async () => {}
      };

      const overrideAction: PaletteAction = {
        id: 'test',
        name: 'Override',
        description: 'Override action',
        icon: '🔄',
        execute: async () => {}
      };

      palette.registerAction(originalAction);
      palette.registerAction(overrideAction);

      const actions = palette.getActions();
      const testAction = actions.find(a => a.id === 'test');

      expect(testAction?.name).toBe('Override');
    });
  });

  describe('unregisterAction', () => {
    it('should remove an action', async () => {
      const customAction: PaletteAction = {
        id: 'custom',
        name: 'Custom Action',
        description: 'A custom action',
        icon: '🎨',
        execute: async () => {}
      };

      palette.registerAction(customAction);
      expect(palette.getActions().some(a => a.id === 'custom')).toBe(true);

      palette.unregisterAction('custom');
      expect(palette.getActions().some(a => a.id === 'custom')).toBe(false);
    });

    it('should handle removing non-existent action gracefully', () => {
      expect(() => {
        palette.unregisterAction('non-existent');
      }).not.toThrow();
    });
  });

  describe('getActions', () => {
    it('should return all registered actions', () => {
      const actions = palette.getActions();

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(0);
    });

    it('should return a new array each time', () => {
      const actions1 = palette.getActions();
      const actions2 = palette.getActions();

      expect(actions1).not.toBe(actions2);
      expect(actions1).toEqual(actions2);
    });
  });

  describe('default actions', () => {
    it('should have load-session action', () => {
      const actions = palette.getActions();
      const loadAction = actions.find(a => a.id === 'load-session');

      expect(loadAction).toBeDefined();
      expect(loadAction?.name).toBe('Load previous session');
      expect(loadAction?.icon).toBe('📂');
      expect(typeof loadAction?.execute).toBe('function');
    });

    it('should have save-session action', () => {
      const actions = palette.getActions();
      const saveAction = actions.find(a => a.id === 'save-session');

      expect(saveAction).toBeDefined();
      expect(saveAction?.name).toBe('Save current session');
      expect(saveAction?.icon).toBe('💾');
      expect(typeof saveAction?.execute).toBe('function');
    });

    it('should have reset-session action', () => {
      const actions = palette.getActions();
      const resetAction = actions.find(a => a.id === 'reset-session');

      expect(resetAction).toBeDefined();
      expect(resetAction?.name).toBe('Reset session');
      expect(resetAction?.icon).toBe('🔄');
      expect(typeof resetAction?.execute).toBe('function');
    });

    it('should have settings action', () => {
      const actions = palette.getActions();
      const settingsAction = actions.find(a => a.id === 'settings');

      expect(settingsAction).toBeDefined();
      expect(settingsAction?.name).toBe('Settings');
      expect(settingsAction?.icon).toBe('⚙️');
      expect(typeof settingsAction?.execute).toBe('function');
    });

    it('should have statistics action', () => {
      const actions = palette.getActions();
      const statsAction = actions.find(a => a.id === 'statistics');

      expect(statsAction).toBeDefined();
      expect(statsAction?.name).toBe('View statistics');
      expect(statsAction?.icon).toBe('📊');
      expect(typeof statsAction?.execute).toBe('function');
    });
  });

  describe('action icons', () => {
    it('should have unique icons for each default action', () => {
      const actions = palette.getActions();
      const icons = actions.map(a => a.icon);
      const uniqueIcons = new Set(icons);

      expect(uniqueIcons.size).toBe(icons.length);
    });

    it('should use emoji icons', () => {
      const actions = palette.getActions();

      actions.forEach(action => {
        expect(action.icon).toBeTruthy();
        expect(action.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('action structure', () => {
    it('should have all required fields for each action', () => {
      const actions = palette.getActions();

      actions.forEach(action => {
        expect(action.id).toBeTruthy();
        expect(action.name).toBeTruthy();
        expect(action.description).toBeTruthy();
        expect(action.icon).toBeTruthy();
        expect(typeof action.execute).toBe('function');
      });
    });
  });

  describe('action descriptions', () => {
    it('should have meaningful descriptions', () => {
      const actions = palette.getActions();

      actions.forEach(action => {
        expect(action.description.length).toBeGreaterThan(5);
        expect(action.description).not.toBe(action.name);
      });
    });
  });

  describe('custom action integration', () => {
    it('should allow adding multiple custom actions', async () => {
      const action1: PaletteAction = {
        id: 'custom1',
        name: 'Custom 1',
        description: 'First custom action',
        icon: '1️⃣',
        execute: async () => {}
      };

      const action2: PaletteAction = {
        id: 'custom2',
        name: 'Custom 2',
        description: 'Second custom action',
        icon: '2️⃣',
        execute: async () => {}
      };

      palette.registerAction(action1);
      palette.registerAction(action2);

      const actions = palette.getActions();
      expect(actions.some(a => a.id === 'custom1')).toBe(true);
      expect(actions.some(a => a.id === 'custom2')).toBe(true);
    });

    it('should execute custom actions', async () => {
      let executed = false;
      const customAction: PaletteAction = {
        id: 'custom',
        name: 'Custom',
        description: 'Custom action',
        icon: '🎨',
        execute: async () => {
          executed = true;
        }
      };

      palette.registerAction(customAction);

      const actions = palette.getActions();
      const action = actions.find(a => a.id === 'custom');

      if (action) {
        await action.execute();
        expect(executed).toBe(true);
      }
    });
  });
});
