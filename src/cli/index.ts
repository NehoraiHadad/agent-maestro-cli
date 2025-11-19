#!/usr/bin/env node

/**
 * CLI Entry Point
 * Main command-line interface for AgentMaestro
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { StartCommand } from './commands/StartCommand.js';
import { ListCommand } from './commands/ListCommand.js';
import { InfoCommand } from './commands/InfoCommand.js';
import { SkillsCommand } from './commands/SkillsCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { DelegateCommand } from './commands/DelegateCommand.js';
import { ListSessionsCommand } from './commands/ListSessionsCommand.js';
import { DeleteSessionCommand } from './commands/DeleteSessionCommand.js';
import { ExportSessionCommand } from './commands/ExportSessionCommand.js';
import { ConfigCommand } from './commands/ConfigCommand.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

const program = new Command();

program
  .name('maestro')
  .description('🎭 Multi-agent AI orchestration CLI')
  .version(packageJson.version);

// Register commands
StartCommand.register(program);
InitCommand.register(program);
DelegateCommand.register(program);
ListCommand.register(program);
InfoCommand.register(program);
SkillsCommand.register(program);
ListSessionsCommand.register(program);
DeleteSessionCommand.register(program);
ExportSessionCommand.register(program);
ConfigCommand.register(program);

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

// Handle session management options
const options = program.opts();

// Execute session commands if provided
(async () => {
  try {
    if (options.listSessions) {
      await ListSessionsCommand.execute();
      process.exit(0);
    }

    if (options.deleteSession) {
      await DeleteSessionCommand.execute(options.deleteSession);
      process.exit(0);
    }

    if (options.export) {
      await ExportSessionCommand.execute(options.export, options.format);
      process.exit(0);
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})();
