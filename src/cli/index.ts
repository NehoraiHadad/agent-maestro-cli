#!/usr/bin/env node

/**
 * CLI Entry Point
 * Main command-line interface for AgentMaestro
 */

import { Command } from 'commander';
import { StartCommand } from './commands/StartCommand.js';
import { ListCommand } from './commands/ListCommand.js';
import { InfoCommand } from './commands/InfoCommand.js';
import { SkillsCommand } from './commands/SkillsCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { DelegateCommand } from './commands/DelegateCommand.js';

const program = new Command();

program
  .name('maestro')
  .description('🎭 Multi-agent AI orchestration CLI')
  .version('2.0.0');

// Register commands
StartCommand.register(program);
InitCommand.register(program);
DelegateCommand.register(program);
ListCommand.register(program);
InfoCommand.register(program);
SkillsCommand.register(program);

// Parse command line arguments
program.parse(process.argv);
