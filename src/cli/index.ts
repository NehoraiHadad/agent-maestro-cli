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

// Graceful shutdown handling
let isShuttingDown = false;

const gracefulShutdown = async (signal: string) => {
  if (isShuttingDown) {
    return; // Already shutting down
  }

  isShuttingDown = true;
  console.log(`\n\nReceived ${signal}. Shutting down gracefully...`);

  try {
    // Allow time for cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Cleanup complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException').then(() => process.exit(1));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection').then(() => process.exit(1));
});

// Parse command line arguments
program.parse(process.argv);
