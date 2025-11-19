/**
 * SessionCommands - handles special session management commands
 * Commands like /reset, /session-info that manage the conversation session
 */

import type { Maestro } from '../../orchestration/Maestro.js';
import { ConsoleLogger } from '../logger/ConsoleLogger.js';
import { SessionPersistence, FileSystemStorage } from '../../persistence/index.js';
import { HistoryManager } from '../../history/index.js';
import { writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

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

    // /search - Search in conversation history
    this.commands.set('/search', {
      name: '/search',
      description: 'Search in conversation history',
      execute: (args?: string) => this.searchHistory(args)
    });

    // /history - Show conversation history with filters
    this.commands.set('/history', {
      name: '/history',
      description: 'Show conversation history (--last N, --agent NAME, --role ROLE)',
      execute: (args?: string) => this.showHistory(args)
    });

    // /export - Export conversation history
    this.commands.set('/export', {
      name: '/export',
      description: 'Export conversation history (json|markdown|text)',
      execute: (args?: string) => this.exportHistory(args)
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

  /**
   * Search in conversation history
   */
  private async searchHistory(query?: string): Promise<void> {
    if (!query || query.trim() === '') {
      this.logger.separator();
      this.logger.error('Please provide a search query.');
      this.logger.info('Usage: /search <query>');
      this.logger.info('Example: /search "authentication"');
      this.logger.separator();
      return;
    }

    this.logger.separator();
    this.logger.info(`🔍 Searching for: "${query}"`);
    this.logger.separator();

    try {
      // Get current session messages
      const sessionManager = (this.maestro as any).sessionManager;
      const messages = sessionManager.getMessages();

      // Create history manager and search
      const historyManager = new HistoryManager(messages);
      const results = historyManager.search(query, {
        includeContext: true,
        contextSize: 1
      });

      if (results.length === 0) {
        this.logger.info('No results found.');
        this.logger.separator();
        return;
      }

      this.logger.success(`Found ${results.length} result${results.length !== 1 ? 's' : ''}:`);
      this.logger.separator();

      // Display results with context
      for (let i = 0; i < results.length; i++) {
        const result = results[i] as any;
        const msg = result.message || result;

        // Show context before
        if (result.before && result.before.length > 0) {
          for (const beforeMsg of result.before) {
            this.logger.info(`  [Context] ${this.formatMessagePreview(beforeMsg)}`);
          }
        }

        // Show matched message
        const roleLabel = this.formatRole(msg.role);
        const agent = msg.metadata.agent ? ` (${String(msg.metadata.agent)})` : '';
        this.logger.info(`\n✓ [${i + 1}] ${roleLabel}${agent}`);
        this.logger.info(`   ${msg.timestamp.toLocaleString()}`);
        this.logger.separator();
        this.logger.info(this.truncateContent(msg.content, 500));
        this.logger.separator();

        // Show context after
        if (result.after && result.after.length > 0) {
          for (const afterMsg of result.after) {
            this.logger.info(`  [Context] ${this.formatMessagePreview(afterMsg)}`);
          }
        }

        if (i < results.length - 1) {
          this.logger.info('');
        }
      }

      this.logger.separator();

    } catch (error) {
      this.logger.separator();
      this.logger.error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.separator();
    }
  }

  /**
   * Show conversation history with filters
   */
  private async showHistory(args?: string): Promise<void> {
    this.logger.separator();
    this.logger.header('Conversation History');
    this.logger.separator();

    try {
      // Parse arguments
      const options = this.parseHistoryArgs(args || '');

      // Get current session messages
      const sessionManager = (this.maestro as any).sessionManager;
      const messages = sessionManager.getMessages();

      // Create history manager
      const historyManager = new HistoryManager(messages);

      // Apply filters
      let filteredMessages = messages;
      if (options.agent || options.role || options.last) {
        filteredMessages = historyManager.filter({
          agents: options.agent ? [options.agent] : undefined,
          roles: options.role ? [options.role as any] : undefined,
          limit: options.last
        });
      }

      if (filteredMessages.length === 0) {
        this.logger.info('No messages found.');
        this.logger.separator();
        return;
      }

      // Show statistics
      const stats = historyManager.getStats();
      this.logger.info(`Total Messages: ${stats.totalMessages}`);
      this.logger.info(`Showing: ${filteredMessages.length} message${filteredMessages.length !== 1 ? 's' : ''}`);
      this.logger.separator();

      // Display messages
      for (let i = 0; i < filteredMessages.length; i++) {
        const msg = filteredMessages[i];
        const roleLabel = this.formatRole(msg.role);
        const agent = msg.metadata.agent ? ` (${String(msg.metadata.agent)})` : '';

        this.logger.info(`\n[${i + 1}] ${roleLabel}${agent}`);
        this.logger.info(`    ${msg.timestamp.toLocaleString()}`);
        this.logger.info(`    ${this.truncateContent(msg.content, 200)}`);
      }

      this.logger.separator();

    } catch (error) {
      this.logger.separator();
      this.logger.error(`Failed to show history: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.separator();
    }
  }

  /**
   * Export conversation history
   */
  private async exportHistory(args?: string): Promise<void> {
    const format = (args || 'json').trim().toLowerCase();

    if (!['json', 'markdown', 'text', 'md', 'txt'].includes(format)) {
      this.logger.separator();
      this.logger.error('Invalid export format.');
      this.logger.info('Usage: /export <format>');
      this.logger.info('Supported formats: json, markdown (md), text (txt)');
      this.logger.separator();
      return;
    }

    this.logger.separator();
    this.logger.info(`📤 Exporting conversation history as ${format}...`);

    try {
      // Normalize format
      const normalizedFormat = format === 'md' ? 'markdown' : format === 'txt' ? 'text' : format;

      // Get current session messages
      const sessionManager = (this.maestro as any).sessionManager;
      const messages = sessionManager.getMessages();

      // Create history manager and export
      const historyManager = new HistoryManager(messages);
      const exported = historyManager.export(normalizedFormat as 'json' | 'md' | 'txt', {
        includeMetadata: true,
        includeTimestamps: true,
        prettyPrint: true,
        includeStats: true
      });

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const sessionSummary = sessionManager.getSummary();
      const sessionId = sessionSummary.sessionId.split('_')[1].substring(0, 8);
      const ext = normalizedFormat === 'markdown' ? 'md' : normalizedFormat === 'text' ? 'txt' : 'json';
      const filename = `conversation-${sessionId}-${timestamp}.${ext}`;
      const filepath = join(homedir(), '.maestro', 'exports', filename);

      // Ensure exports directory exists
      const { mkdirSync, existsSync } = await import('fs');
      const exportsDir = join(homedir(), '.maestro', 'exports');
      if (!existsSync(exportsDir)) {
        mkdirSync(exportsDir, { recursive: true });
      }

      // Write file
      writeFileSync(filepath, exported, 'utf-8');

      this.logger.separator();
      this.logger.success('✓ Export successful');
      this.logger.info(`File: ${filepath}`);
      this.logger.info(`Format: ${normalizedFormat}`);
      this.logger.info(`Messages: ${messages.length}`);
      this.logger.separator();

    } catch (error) {
      this.logger.separator();
      this.logger.error(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
      this.logger.separator();
    }
  }

  /**
   * Parse history command arguments
   */
  private parseHistoryArgs(args: string): { last?: number; agent?: string; role?: string } {
    const options: { last?: number; agent?: string; role?: string } = {};
    const parts = args.split(/\s+/);

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '--last' && i + 1 < parts.length) {
        options.last = parseInt(parts[i + 1], 10);
        i++;
      } else if (part === '--agent' && i + 1 < parts.length) {
        options.agent = parts[i + 1];
        i++;
      } else if (part === '--role' && i + 1 < parts.length) {
        options.role = parts[i + 1];
        i++;
      }
    }

    return options;
  }

  /**
   * Format message role for display
   */
  private formatRole(role: string): string {
    switch (role) {
      case 'user':
        return 'User';
      case 'assistant':
        return 'Assistant';
      case 'delegation':
        return 'Delegation';
      case 'system':
        return 'System';
      default:
        return role;
    }
  }

  /**
   * Format message preview for context display
   */
  private formatMessagePreview(msg: any): string {
    const roleLabel = this.formatRole(msg.role);
    const content = this.truncateContent(msg.content, 80);
    return `${roleLabel}: ${content}`;
  }

  /**
   * Truncate content to specified length
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  }
}
