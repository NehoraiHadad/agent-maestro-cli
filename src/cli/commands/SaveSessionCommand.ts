/**
 * SaveSessionCommand - Save current or specified session
 * Note: This functionality is primarily available through the /save command in interactive mode
 */

import { Command } from 'commander';
import { ConsoleLogger } from '../../features/ui/index.js';

/**
 * SaveSessionCommand - handles saving sessions
 */
export class SaveSessionCommand {
  private static logger = new ConsoleLogger();

  /**
   * Register the save command with the CLI program
   */
  static register(program: Command): void {
    program
      .option('--save', 'save current session (use /save in interactive mode)')
      .option('--save-name <name>', 'optional name for the saved session');
  }

  /**
   * Execute the save command
   */
  static async execute(): Promise<void> {
    try {
      this.logger.separator();
      this.logger.info('💾 Saving session...');

      // Note: This command is intended to be called from interactive mode
      // where we have access to the current session
      this.logger.warn('\nNote: The --save command should be used within an active session.');
      this.logger.info('Use the /save command in interactive mode instead.');
      this.logger.separator();

    } catch (error) {
      this.logger.error(`\nError saving session: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}
