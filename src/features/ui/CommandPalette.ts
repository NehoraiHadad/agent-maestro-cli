/**
 * CommandPalette - Interactive command palette with session management and settings
 * Provides quick access to common actions via Ctrl+P shortcut
 */

import inquirer from 'inquirer';
import type { Maestro } from '../orchestration/Maestro.js';
import { ConsoleLogger } from './logger/ConsoleLogger.js';
import { SessionPersistence, FileSystemStorage } from '../persistence/index.js';
import type { SessionMetadata } from '../persistence/types.js';
import type { MaestroConfig } from '../config/types.js';
import chalk from 'chalk';

export interface PaletteAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  execute: () => Promise<void>;
}

export interface PaletteAnswer {
  action: string;
}

/**
 * Interactive command palette for quick actions
 */
export class CommandPalette {
  private maestro: Maestro;
  private logger: ConsoleLogger;
  private actions: Map<string, PaletteAction>;
  private persistence: SessionPersistence;

  constructor(maestro: Maestro, logger?: ConsoleLogger) {
    this.maestro = maestro;
    this.logger = logger || new ConsoleLogger();
    this.actions = new Map();

    const storage = new FileSystemStorage();
    this.persistence = new SessionPersistence(storage);

    this.registerDefaultActions();
  }

  /**
   * Show the command palette
   * @returns Selected action ID or undefined if cancelled
   */
  async show(): Promise<string | undefined> {
    const choices = Array.from(this.actions.values()).map(action => ({
      name: `${action.icon}  ${action.name} - ${action.description}`,
      value: action.id,
      short: action.name
    }));

    // Add separator and exit option
    choices.push(
      { name: chalk.gray('─'.repeat(50)), value: 'separator', short: '' } as any,
      {
        name: `❌  Exit palette`,
        value: 'exit',
        short: 'Exit'
      }
    );

    try {
      const answer = await inquirer.prompt<PaletteAnswer>([
        {
          type: 'list',
          name: 'action',
          message: chalk.bold.cyan('📋 Command Palette (Ctrl+P)'),
          choices,
          pageSize: 12,
          loop: false
        }
      ]);

      const selectedId = answer.action;

      if (selectedId === 'exit' || selectedId === 'separator') {
        return undefined;
      }

      const action = this.actions.get(selectedId);
      if (action) {
        await action.execute();
        return selectedId;
      }

      return undefined;
    } catch (error) {
      // User cancelled (Ctrl+C)
      return undefined;
    }
  }

  /**
   * Register a custom action
   * @param action - Action to register
   */
  registerAction(action: PaletteAction): void {
    this.actions.set(action.id, action);
  }

  /**
   * Unregister an action
   * @param actionId - Action ID to remove
   */
  unregisterAction(actionId: string): void {
    this.actions.delete(actionId);
  }

  /**
   * Get all registered actions
   */
  getActions(): PaletteAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Register default actions
   */
  private registerDefaultActions(): void {
    // Load previous session
    this.registerAction({
      id: 'load-session',
      name: 'Load previous session',
      description: 'Restore a saved session',
      icon: '📂',
      execute: async () => this.loadSession()
    });

    // Save current session
    this.registerAction({
      id: 'save-session',
      name: 'Save current session',
      description: 'Save conversation to disk',
      icon: '💾',
      execute: async () => this.saveSession()
    });

    // Reset session
    this.registerAction({
      id: 'reset-session',
      name: 'Reset session',
      description: 'Start a new conversation',
      icon: '🔄',
      execute: async () => this.resetSession()
    });

    // Settings
    this.registerAction({
      id: 'settings',
      name: 'Settings',
      description: 'Edit configuration',
      icon: '⚙️',
      execute: async () => this.openSettings()
    });

    // View statistics
    this.registerAction({
      id: 'statistics',
      name: 'View statistics',
      description: 'Show session stats',
      icon: '📊',
      execute: async () => this.showStatistics()
    });
  }

  /**
   * Load a saved session
   */
  private async loadSession(): Promise<void> {
    try {
      const sessions = await this.persistence.list();

      if (sessions.length === 0) {
        this.logger.warn('No saved sessions found.');
        return;
      }

      // Sort by most recent
      sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Create choices
      const choices = sessions.map((session: SessionMetadata) => ({
        name: this.formatSessionChoice(session),
        value: session.sessionId,
        short: session.name || session.sessionId.substring(0, 8)
      }));

      interface SessionAnswer {
        sessionId: string;
      }

      const answer = await inquirer.prompt<SessionAnswer>([
        {
          type: 'list',
          name: 'sessionId',
          message: 'Select a session to load:',
          choices,
          pageSize: 10
        }
      ]);

      const savedSession = await this.persistence.load(answer.sessionId);

      this.logger.separator();
      this.logger.success('✓ Session loaded successfully');
      this.logger.info(`Session ID: ${savedSession.metadata.sessionId}`);
      if (savedSession.metadata.name) {
        this.logger.info(`Name: "${savedSession.metadata.name}"`);
      }
      this.logger.info(`Messages: ${savedSession.metadata.messageCount}`);
      this.logger.info(`Created: ${savedSession.metadata.createdAt.toLocaleString()}`);
      this.logger.separator();
      this.logger.warn('⚠️  Note: Session loading into active context is not yet implemented.');
      this.logger.info('You can export the session using: maestro --export <sessionId> <format>');
      this.logger.separator();

    } catch (error) {
      if ((error as any).name === 'ExitPromptError') {
        // User cancelled
        return;
      }
      this.logger.error(`Failed to load session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save current session
   */
  private async saveSession(): Promise<void> {
    try {
      interface SaveAnswer {
        name: string;
        addTags: boolean;
        tags?: string;
      }

      const answers = await inquirer.prompt<SaveAnswer>([
        {
          type: 'input',
          name: 'name',
          message: 'Session name (optional):',
          default: ''
        },
        {
          type: 'confirm',
          name: 'addTags',
          message: 'Add tags?',
          default: false
        },
        {
          type: 'input',
          name: 'tags',
          message: 'Tags (comma-separated):',
          when: (answers) => answers.addTags,
          filter: (input: string) => input.trim()
        }
      ]);

      const sessionExport = this.maestro.exportSession();
      const tags = answers.tags
        ? answers.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
        : [];

      const sessionId = await this.persistence.save(sessionExport, {
        name: answers.name || undefined,
        tags
      });

      this.logger.separator();
      this.logger.success('✓ Session saved successfully');
      this.logger.info(`Session ID: ${sessionId}`);
      if (answers.name) {
        this.logger.info(`Name: "${answers.name}"`);
      }
      if (tags.length > 0) {
        this.logger.info(`Tags: ${tags.join(', ')}`);
      }
      this.logger.info(`Messages: ${sessionExport.summary.messageCount}`);
      this.logger.separator();

    } catch (error) {
      if ((error as any).name === 'ExitPromptError') {
        // User cancelled
        return;
      }
      this.logger.error(`Failed to save session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Reset the current session
   */
  private async resetSession(): Promise<void> {
    try {
      interface ResetAnswer {
        confirm: boolean;
      }

      const answer = await inquirer.prompt<ResetAnswer>([
        {
          type: 'confirm',
          name: 'confirm',
          message: chalk.yellow('⚠️  Are you sure you want to reset the session? This will clear the conversation history.'),
          default: false
        }
      ]);

      if (!answer.confirm) {
        this.logger.info('Reset cancelled.');
        return;
      }

      this.maestro.resetSession();

      this.logger.separator();
      this.logger.success('✓ Session reset successfully');
      this.logger.info('The next message will start a new conversation.');
      this.logger.separator();

    } catch (error) {
      if ((error as any).name === 'ExitPromptError') {
        // User cancelled
        return;
      }
      this.logger.error(`Failed to reset session: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Open settings editor
   */
  private async openSettings(): Promise<void> {
    try {
      const configManager = this.maestro.getConfigManager();
      const currentConfig = configManager.getAll();

      interface SettingsAnswer {
        setting: string;
      }

      // Settings menu
      const settingChoices = [
        { name: `Plan Mode: ${currentConfig.planMode ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')}`, value: 'planMode' },
        { name: `Theme: ${currentConfig.theme}`, value: 'theme' },
        { name: `Auto Save: ${currentConfig.autoSave ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')}`, value: 'autoSave' },
        { name: `Log Level: ${currentConfig.logLevel}`, value: 'logLevel' },
        { name: `Show Spinner: ${currentConfig.ui.showSpinner ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')}`, value: 'showSpinner' },
        { name: `Status Display: ${currentConfig.ui.statusDisplay}`, value: 'statusDisplay' },
        { name: `Session Persistence: ${currentConfig.features.sessionPersistence ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')}`, value: 'sessionPersistence' },
        { name: chalk.gray('─'.repeat(50)), value: 'separator' },
        { name: '💾 Save configuration to file', value: 'save' },
        { name: '🔄 Reset to defaults', value: 'reset' },
        { name: '← Back', value: 'back' }
      ];

      const answer = await inquirer.prompt<SettingsAnswer>([
        {
          type: 'list',
          name: 'setting',
          message: chalk.bold.cyan('⚙️  Settings'),
          choices: settingChoices,
          pageSize: 12
        }
      ]);

      switch (answer.setting) {
        case 'planMode':
          await this.editBooleanSetting('planMode', 'Plan Mode', currentConfig.planMode);
          break;
        case 'theme':
          await this.editThemeSetting(currentConfig.theme);
          break;
        case 'autoSave':
          await this.editBooleanSetting('autoSave', 'Auto Save', currentConfig.autoSave);
          break;
        case 'logLevel':
          await this.editLogLevelSetting(currentConfig.logLevel);
          break;
        case 'showSpinner':
          await this.editUIBooleanSetting('showSpinner', 'Show Spinner', currentConfig.ui.showSpinner);
          break;
        case 'statusDisplay':
          await this.editStatusDisplaySetting(currentConfig.ui.statusDisplay);
          break;
        case 'sessionPersistence':
          await this.editFeatureBooleanSetting('sessionPersistence', 'Session Persistence', currentConfig.features.sessionPersistence);
          break;
        case 'save':
          await this.saveConfiguration(configManager);
          break;
        case 'reset':
          await this.resetConfiguration(configManager);
          break;
        case 'back':
        case 'separator':
          return;
      }

    } catch (error) {
      if ((error as any).name === 'ExitPromptError') {
        // User cancelled
        return;
      }
      this.logger.error(`Failed to open settings: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Edit a boolean setting
   */
  private async editBooleanSetting(key: keyof MaestroConfig, label: string, currentValue: boolean): Promise<void> {
    interface BoolAnswer {
      value: boolean;
    }

    const answer = await inquirer.prompt<BoolAnswer>([
      {
        type: 'confirm',
        name: 'value',
        message: `${label}:`,
        default: currentValue
      }
    ]);

    const configManager = this.maestro.getConfigManager();
    configManager.set(key, answer.value as any);
    this.logger.success(`✓ ${label} updated to: ${answer.value}`);
  }

  /**
   * Edit a UI boolean setting
   */
  private async editUIBooleanSetting(key: keyof MaestroConfig['ui'], label: string, currentValue: boolean): Promise<void> {
    interface BoolAnswer {
      value: boolean;
    }

    const answer = await inquirer.prompt<BoolAnswer>([
      {
        type: 'confirm',
        name: 'value',
        message: `${label}:`,
        default: currentValue
      }
    ]);

    const configManager = this.maestro.getConfigManager();
    const config = configManager.getAll();
    const updatedUI = { ...config.ui, [key]: answer.value };
    configManager.merge({ ui: updatedUI });
    this.logger.success(`✓ ${label} updated to: ${answer.value}`);
  }

  /**
   * Edit a feature boolean setting
   */
  private async editFeatureBooleanSetting(key: keyof MaestroConfig['features'], label: string, currentValue: boolean): Promise<void> {
    interface BoolAnswer {
      value: boolean;
    }

    const answer = await inquirer.prompt<BoolAnswer>([
      {
        type: 'confirm',
        name: 'value',
        message: `${label}:`,
        default: currentValue
      }
    ]);

    const configManager = this.maestro.getConfigManager();
    const config = configManager.getAll();
    const updatedFeatures = { ...config.features, [key]: answer.value };
    configManager.merge({ features: updatedFeatures });
    this.logger.success(`✓ ${label} updated to: ${answer.value}`);
  }

  /**
   * Edit theme setting
   */
  private async editThemeSetting(currentTheme: 'dark' | 'light'): Promise<void> {
    interface ThemeAnswer {
      theme: 'dark' | 'light';
    }

    const answer = await inquirer.prompt<ThemeAnswer>([
      {
        type: 'list',
        name: 'theme',
        message: 'Select theme:',
        choices: [
          { name: '🌙 Dark', value: 'dark' },
          { name: '☀️  Light', value: 'light' }
        ],
        default: currentTheme
      }
    ]);

    const configManager = this.maestro.getConfigManager();
    configManager.set('theme', answer.theme);
    this.logger.success(`✓ Theme updated to: ${answer.theme}`);
  }

  /**
   * Edit log level setting
   */
  private async editLogLevelSetting(currentLevel: string): Promise<void> {
    interface LogLevelAnswer {
      logLevel: 'debug' | 'info' | 'warn' | 'error';
    }

    const answer = await inquirer.prompt<LogLevelAnswer>([
      {
        type: 'list',
        name: 'logLevel',
        message: 'Select log level:',
        choices: [
          { name: '🐛 Debug', value: 'debug' },
          { name: 'ℹ️  Info', value: 'info' },
          { name: '⚠️  Warn', value: 'warn' },
          { name: '❌ Error', value: 'error' }
        ],
        default: currentLevel
      }
    ]);

    const configManager = this.maestro.getConfigManager();
    configManager.set('logLevel', answer.logLevel);
    this.logger.success(`✓ Log level updated to: ${answer.logLevel}`);
  }

  /**
   * Edit status display setting
   */
  private async editStatusDisplaySetting(currentSetting: 'basic' | 'enhanced'): Promise<void> {
    interface StatusDisplayAnswer {
      statusDisplay: 'basic' | 'enhanced';
    }

    const answer = await inquirer.prompt<StatusDisplayAnswer>([
      {
        type: 'list',
        name: 'statusDisplay',
        message: 'Select status display mode:',
        choices: [
          { name: '📊 Enhanced (with header and progress)', value: 'enhanced' },
          { name: '📋 Basic (minimal)', value: 'basic' }
        ],
        default: currentSetting
      }
    ]);

    const configManager = this.maestro.getConfigManager();
    const config = configManager.getAll();
    const updatedUI = { ...config.ui, statusDisplay: answer.statusDisplay };
    configManager.merge({ ui: updatedUI });
    this.logger.success(`✓ Status display updated to: ${answer.statusDisplay}`);
  }

  /**
   * Save configuration to file
   */
  private async saveConfiguration(configManager: any): Promise<void> {
    try {
      configManager.save();
      this.logger.success('✓ Configuration saved to ~/.maestrorc.json');
    } catch (error) {
      this.logger.error(`Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Reset configuration to defaults
   */
  private async resetConfiguration(configManager: any): Promise<void> {
    interface ResetAnswer {
      confirm: boolean;
    }

    const answer = await inquirer.prompt<ResetAnswer>([
      {
        type: 'confirm',
        name: 'confirm',
        message: chalk.yellow('⚠️  Reset all settings to defaults?'),
        default: false
      }
    ]);

    if (!answer.confirm) {
      this.logger.info('Reset cancelled.');
      return;
    }

    configManager.reset();
    this.logger.success('✓ Configuration reset to defaults');
  }

  /**
   * Show session statistics
   */
  private async showStatistics(): Promise<void> {
    const stats = this.maestro.getStats();

    this.logger.separator();
    this.logger.header('📊 Session Statistics');
    this.logger.separator();

    this.logger.info(`Total Messages: ${stats.totalMessages}`);
    this.logger.info(`User Messages: ${stats.userMessages}`);
    this.logger.info(`Assistant Messages: ${stats.assistantMessages}`);
    this.logger.info(`Delegation Messages: ${stats.delegationMessages}`);

    const durationSec = Math.floor(stats.sessionDuration / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;

    this.logger.info(`\nSession Duration: ${minutes}m ${seconds}s`);
    this.logger.info(`Start Time: ${stats.startTime.toLocaleString()}`);
    this.logger.info(`Plan Mode: ${this.maestro.isPlanMode() ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')}`);

    this.logger.separator();

    // Wait for user acknowledgment
    interface AckAnswer {
      continue: boolean;
    }

    await inquirer.prompt<AckAnswer>([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Press Enter to continue...',
        default: true
      }
    ]);
  }

  /**
   * Format session choice for display
   */
  private formatSessionChoice(session: SessionMetadata): string {
    const name = session.name ? `"${session.name}"` : chalk.gray('(unnamed)');
    const date = session.updatedAt.toLocaleDateString();
    const time = session.updatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const duration = Math.floor(session.duration / 1000);
    const messages = session.messageCount;

    return `${name} - ${chalk.gray(`${date} ${time}`)} - ${chalk.cyan(`${messages} msgs`)} - ${chalk.yellow(`${duration}s`)}`;
  }
}
