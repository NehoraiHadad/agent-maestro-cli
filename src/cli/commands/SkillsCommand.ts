/**
 * SkillsCommand - Manage AgentMaestro Skills for Claude Code
 */

import { Command } from 'commander';
import {
  installSkills,
  uninstallSkills,
  showSkillsStatus
} from '../../commands/install-skills.js';

export class SkillsCommand {
  /**
   * Register the skills command with Commander
   */
  static register(program: Command): void {
    const skillsCommand = program
      .command('skills')
      .description('Manage AgentMaestro Skills for Claude Code');

    // install subcommand
    skillsCommand
      .command('install')
      .description('Install AgentMaestro delegation advisor skill')
      .action(async () => {
        const success = await installSkills();
        process.exit(success ? 0 : 1);
      });

    // uninstall subcommand
    skillsCommand
      .command('uninstall')
      .description('Uninstall AgentMaestro skills')
      .action(async () => {
        const success = await uninstallSkills();
        process.exit(success ? 0 : 1);
      });

    // status subcommand
    skillsCommand
      .command('status')
      .description('Show AgentMaestro skills installation status')
      .action(async () => {
        await showSkillsStatus();
        process.exit(0);
      });

    // Default action when no subcommand (show help)
    skillsCommand.action(() => {
      skillsCommand.help();
    });
  }
}
