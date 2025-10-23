/**
 * SessionCommands - handles special session management commands
 * Commands like /reset, /session-info that manage the conversation session
 */

import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';

export interface SessionCommand {
  name: string;
  description: string;
  execute: () => Promise<void> | void;
}

/**
 * Manages session-specific commands
 */
export class SessionCommands {
  private maestro: Maestro;
  private logger: ConsoleLogger;
  private commands: Map<string, SessionCommand>;

  constructor(maestro: Maestro, logger: ConsoleLogger) {
    this.maestro = maestro;
    this.logger = logger;
    this.commands = new Map();

    this.registerCommands();
  }

  /**
   * Register all available session commands
   */
  private registerCommands(): void {
    // /reset - Reset the conversation session
    this.commands.set('/reset', {
      name: '/reset',
      description: 'Reset the conversation (start a new session)',
      execute: () => this.resetSession()
    });

    // /session-info - Display session information
    this.commands.set('/session-info', {
      name: '/session-info',
      description: 'Display current session information',
      execute: () => this.showSessionInfo()
    });

    // /help-session - Show session commands
    this.commands.set('/help-session', {
      name: '/help-session',
      description: 'Show available session commands',
      execute: () => this.showHelp()
    });
  }

  /**
   * Check if a message is a session command
   */
  isSessionCommand(message: string): boolean {
    const trimmed = message.trim();
    return this.commands.has(trimmed);
  }

  /**
   * Execute a session command
   */
  async execute(message: string): Promise<boolean> {
    const trimmed = message.trim();
    const command = this.commands.get(trimmed);

    if (!command) {
      return false;
    }

    await command.execute();
    return true;
  }

  /**
   * Reset the current session
   */
  private resetSession(): void {
    this.logger.separator();
    this.logger.warn('⚠️  Resetting session...');
    this.logger.info('The next message will start a new conversation.');
    this.logger.info('(Session ID will be cleared)');
    this.logger.separator();

    // Reset the session via Maestro
    this.maestro.resetSession();

    this.logger.success('✓ Session reset successfully');
    this.logger.info('The next message will start fresh without --continue');
    this.logger.separator();
  }

  /**
   * Show current session information
   */
  private showSessionInfo(): void {
    const stats = this.maestro.getStats();

    // We need access to SessionManager to get Session ID
    // For now, we'll show available stats
    this.logger.separator();
    this.logger.header('Session Information');
    this.logger.separator();

    this.logger.info(`Total Messages: ${stats.totalMessages}`);

    const durationSec = Math.floor(stats.sessionDuration / 1000);
    const minutes = Math.floor(durationSec / 60);
    const seconds = durationSec % 60;

    this.logger.info(`Session Duration: ${minutes}m ${seconds}s`);
    this.logger.info(`Plan Mode: ${this.maestro.isPlanMode() ? 'Enabled ✓' : 'Disabled'}`);

    // Note: Session ID would be shown here if we had access to SessionManager
    this.logger.info(`\nNote: Session continuity is active.`);
    this.logger.info(`Use /reset to start a new conversation.`);

    this.logger.separator();
  }

  /**
   * Show help for session commands
   */
  private showHelp(): void {
    this.logger.separator();
    this.logger.header('Session Commands');
    this.logger.separator();

    for (const [name, command] of this.commands) {
      this.logger.info(`${name.padEnd(20)} - ${command.description}`);
    }

    this.logger.separator();
  }

  /**
   * Get all available command names
   */
  getCommandNames(): string[] {
    return Array.from(this.commands.keys());
  }
}
