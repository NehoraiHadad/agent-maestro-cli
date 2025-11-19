/**
 * DeleteSessionCommand - Delete a saved session
 * Usage: maestro --delete-session <sessionId>
 */

import { Command } from 'commander';
import { ConsoleLogger } from '../../features/ui/index.js';
import { SessionPersistence, FileSystemStorage } from '../../features/persistence/index.js';
import inquirer from 'inquirer';

/**
 * DeleteSessionCommand - handles deleting saved sessions
 */
export class DeleteSessionCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the delete-session command with the CLI program
   */
  static register(program: Command): void {
    program
      .option('--delete-session <sessionId>', 'delete a saved session');
  }

  /**
   * Execute the delete-session command
   */
  static async execute(sessionId: string): Promise<void> {
    try {
      this.logger.separator();
      this.logger.info('🗑️  Deleting session...');

      // Create persistence service
      const storage = new FileSystemStorage();
      const persistence = new SessionPersistence(storage);

      // Check if session exists
      const exists = await persistence.exists(sessionId);
      if (!exists) {
        this.logger.error(`\nSession not found: ${sessionId}`);
        process.exit(1);
      }

      // Load session to show details
      const savedSession = await persistence.load(sessionId);
      const name = savedSession.metadata.name ? `"${savedSession.metadata.name}"` : '(unnamed)';

      this.logger.separator();
      this.logger.warn(`⚠️  About to delete session: ${name}`);
      this.logger.info(`   ID: ${sessionId}`);
      this.logger.info(`   Messages: ${savedSession.metadata.messageCount}`);
      this.logger.separator();

      // Confirm deletion
      const answer = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete this session?',
          default: false
        }
      ]);

      if (!answer.confirm) {
        this.logger.info('\nDeletion cancelled.');
        this.logger.separator();
        return;
      }

      // Delete the session
      await persistence.delete(sessionId);

      this.logger.separator();
      this.logger.success('✓ Session deleted successfully');
      this.logger.separator();

    } catch (error) {
      this.logger.error(`\nError deleting session: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}
