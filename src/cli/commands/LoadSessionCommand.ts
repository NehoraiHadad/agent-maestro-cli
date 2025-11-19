/**
 * LoadSessionCommand - Load and resume a saved session
 * Usage: maestro --load <sessionId>
 */

import { Command } from 'commander';
import { ConsoleLogger } from '../../features/ui/index.js';
import { SessionPersistence, FileSystemStorage } from '../../features/persistence/index.js';

/**
 * LoadSessionCommand - handles loading sessions
 */
export class LoadSessionCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the load command with the CLI program
   */
  static register(program: Command): void {
    program
      .option('--load <sessionId>', 'load and resume a saved session');
  }

  /**
   * Execute the load command
   */
  static async execute(sessionId: string): Promise<void> {
    try {
      this.logger.separator();
      this.logger.info('📂 Loading session...');

      // Create persistence service
      const storage = new FileSystemStorage();
      const persistence = new SessionPersistence(storage);

      // Load the session
      const savedSession = await persistence.load(sessionId);

      this.logger.separator();
      this.logger.success('✓ Session loaded successfully');
      this.logger.separator();

      // Display session info
      this.logger.info(`Session ID: ${savedSession.metadata.sessionId}`);
      if (savedSession.metadata.name) {
        this.logger.info(`Name: ${savedSession.metadata.name}`);
      }
      this.logger.info(`Created: ${savedSession.metadata.createdAt.toLocaleString()}`);
      this.logger.info(`Messages: ${savedSession.metadata.messageCount}`);
      this.logger.info(`Duration: ${Math.floor(savedSession.metadata.duration / 1000)}s`);

      if (savedSession.metadata.tags && savedSession.metadata.tags.length > 0) {
        this.logger.info(`Tags: ${savedSession.metadata.tags.join(', ')}`);
      }

      this.logger.separator();
      this.logger.info('\nNote: Session loading in interactive mode is not yet implemented.');
      this.logger.info('Use --export to view the session content.');
      this.logger.separator();

    } catch (error) {
      this.logger.error(`\nError loading session: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}
