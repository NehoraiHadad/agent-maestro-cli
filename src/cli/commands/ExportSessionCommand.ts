/**
 * ExportSessionCommand - Export a session to JSON or Markdown
 * Usage: maestro --export <sessionId> <format>
 */

import { Command } from 'commander';
import { ConsoleLogger } from '../../features/ui/index.js';
import { SessionPersistence, FileSystemStorage } from '../../features/persistence/index.js';

/**
 * ExportSessionCommand - handles exporting sessions
 */
export class ExportSessionCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the export command with the CLI program
   */
  static register(program: Command): void {
    program
      .option('--export <sessionId>', 'export a session')
      .option('--format <format>', 'export format (json or markdown)', 'json');
  }

  /**
   * Execute the export command
   */
  static async execute(sessionId: string, format: string = 'json'): Promise<void> {
    try {
      // Create persistence service
      const storage = new FileSystemStorage();
      const persistence = new SessionPersistence(storage);

      // Check if session exists
      const exists = await persistence.exists(sessionId);
      if (!exists) {
        this.logger.error(`\nSession not found: ${sessionId}`);
        process.exit(1);
      }

      // Export based on format
      let output: string;
      const lowerFormat = format.toLowerCase();

      if (lowerFormat === 'json') {
        output = await persistence.exportToJson(sessionId);
      } else if (lowerFormat === 'markdown' || lowerFormat === 'md') {
        output = await persistence.exportToMarkdown(sessionId);
      } else {
        this.logger.error(`\nInvalid format: ${format}`);
        this.logger.info('Supported formats: json, markdown');
        process.exit(1);
      }

      // Output to stdout (can be redirected to file)
      console.log(output);

    } catch (error) {
      this.logger.error(`\nError exporting session: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}
