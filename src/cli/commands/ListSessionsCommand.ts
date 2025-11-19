/**
 * ListSessionsCommand - List all saved sessions
 * Usage: maestro --list-sessions
 */

import { Command } from 'commander';
import { ConsoleLogger } from '../../features/ui/index.js';
import { SessionPersistence, FileSystemStorage } from '../../features/persistence/index.js';

/**
 * ListSessionsCommand - handles listing saved sessions
 */
export class ListSessionsCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the list-sessions command with the CLI program
   */
  static register(program: Command): void {
    program
      .option('--list-sessions', 'list all saved sessions');
  }

  /**
   * Execute the list-sessions command
   */
  static async execute(): Promise<void> {
    try {
      this.logger.separator();
      this.logger.header('Saved Sessions');
      this.logger.separator();

      // Create persistence service
      const storage = new FileSystemStorage();
      const persistence = new SessionPersistence(storage);

      // List all sessions
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
      this.logger.info(`Storage: ${storage.getBaseDir()}`);
      this.logger.separator();

    } catch (error) {
      this.logger.error(`\nError listing sessions: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}
