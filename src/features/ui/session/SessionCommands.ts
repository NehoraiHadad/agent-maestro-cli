/**
 * SessionCommands - handles special session management commands
 * Commands like /reset, /session-info that manage the conversation session
 */

import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import { SessionPersistence, FileSystemStorage } from '../../persistence/index.js';

export interface SessionCommand {
  name: string;
  description: string;
  execute: (args?: string) => Promise<void> | void;
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

    // /save - Save current session
    this.commands.set('/save', {
      name: '/save',
      description: 'Save current session with optional name',
      execute: (args?: string) => this.saveSession(args)
    });

    // /sessions - List all saved sessions
    this.commands.set('/sessions', {
      name: '/sessions',
      description: 'List all saved sessions',
      execute: () => this.listSessions()
    });

    // /load - Load a saved session
    this.commands.set('/load', {
      name: '/load',
      description: 'Load a saved session by ID',
      execute: (args?: string) => this.loadSession(args)
    });
  }

  /**
   * Check if a message is a session command
   */
  isSessionCommand(message: string): boolean {
    const trimmed = message.trim();
    const commandName = trimmed.split(' ')[0];
    return this.commands.has(commandName);
  }

  /**
   * Execute a session command
   */
  async execute(message: string): Promise<boolean> {
    const trimmed = message.trim();
    const parts = trimmed.split(' ');
    const commandName = parts[0];
    const args = parts.slice(1).join(' ');

    const command = this.commands.get(commandName);

    if (!command) {
      return false;
    }

    await command.execute(args);
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

  /**
   * Save current session
   */
  private async saveSession(name?: string): Promise<void> {
    this.logger.separator();
    this.logger.info('💾 Saving session...');

    try {
      const storage = new FileSystemStorage();
      const persistence = new SessionPersistence(storage);

      // Export current session
      const sessionExport = this.maestro.exportSession();

      // Save with optional name
      const sessionId = await persistence.save(sessionExport, {
        name: name || undefined
      });

      this.logger.separator();
      this.logger.success('✓ Session saved successfully');
      this.logger.info(`Session ID: ${sessionId}`);
      if (name) {
        this.logger.info(`Name: "${name}"`);
      }
      this.logger.info(`Messages: ${sessionExport.summary.messageCount}`);
      this.logger.info(`Storage: ${storage.getBaseDir()}`);
      this.logger.separator();

    } catch (error) {
      this.logger.separator();
      this.logger.error(`Failed to save session: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.separator();
    }
  }

  /**
   * List all saved sessions
   */
  private async listSessions(): Promise<void> {
    this.logger.separator();
    this.logger.header('Saved Sessions');
    this.logger.separator();

    try {
      const storage = new FileSystemStorage();
      const persistence = new SessionPersistence(storage);

      const sessions = await persistence.list();

      if (sessions.length === 0) {
        this.logger.info('No saved sessions found.');
        this.logger.info(`\nSessions are stored in: ${storage.getBaseDir()}`);
        this.logger.separator();
        return;
      }

      // Sort by updatedAt (most recent first)
      sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

      // Display sessions
      for (const session of sessions) {
        const name = session.name ? `"${session.name}"` : '(unnamed)';
        const date = session.updatedAt.toLocaleString();
        const duration = Math.floor(session.duration / 1000);
        const messages = session.messageCount;

        this.logger.info(`\n📝 ${name}`);
        this.logger.info(`   ID: ${session.sessionId}`);
        this.logger.info(`   Updated: ${date}`);
        this.logger.info(`   Messages: ${messages} | Duration: ${duration}s`);

        if (session.tags && session.tags.length > 0) {
          this.logger.info(`   Tags: ${session.tags.join(', ')}`);
        }
      }

      this.logger.separator();
      this.logger.info(`\nTotal: ${sessions.length} session${sessions.length !== 1 ? 's' : ''}`);
      this.logger.separator();

    } catch (error) {
      this.logger.separator();
      this.logger.error(`Failed to list sessions: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.separator();
    }
  }

  /**
   * Load a saved session
   */
  private async loadSession(sessionId?: string): Promise<void> {
    if (!sessionId) {
      this.logger.separator();
      this.logger.error('Please provide a session ID to load.');
      this.logger.info('Usage: /load <sessionId>');
      this.logger.info('Use /sessions to see all available sessions.');
      this.logger.separator();
      return;
    }

    this.logger.separator();
    this.logger.info('📂 Loading session...');

    try {
      const storage = new FileSystemStorage();
      const persistence = new SessionPersistence(storage);

      const savedSession = await persistence.load(sessionId);

      this.logger.separator();
      this.logger.success('✓ Session loaded successfully');
      this.logger.separator();

      // Display session info
      this.logger.info(`Session ID: ${savedSession.metadata.sessionId}`);
      if (savedSession.metadata.name) {
        this.logger.info(`Name: "${savedSession.metadata.name}"`);
      }
      this.logger.info(`Created: ${savedSession.metadata.createdAt.toLocaleString()}`);
      this.logger.info(`Messages: ${savedSession.metadata.messageCount}`);

      this.logger.separator();
      this.logger.warn('⚠️  Session loading into active context is not yet implemented.');
      this.logger.info('You can export the session using: maestro --export <sessionId> <format>');
      this.logger.separator();

    } catch (error) {
      this.logger.separator();
      this.logger.error(`Failed to load session: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.separator();
    }
  }
}
