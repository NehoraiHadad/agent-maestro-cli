#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { AGENTS } from './config.js';
import { MaestroCLI } from './core/maestro-cli.js';
import { Logger } from './utils/logger.js';

const program = new Command();

program
  .name('maestro')
  .description('CLI wrapper for collaborative AI agents')
  .version('1.0.0')
  .option('-a, --agent <name>', 'Primary agent (claude|gemini|codex)')
  .action((options) => {
    if (!options.agent) {
      showAgentSelection();
      return;
    }

    const primaryAgent = AGENTS[options.agent.toLowerCase()];
    if (!primaryAgent) {
      Logger.error(`Unknown agent: ${options.agent}`);
      showAgentSelection();
      process.exit(1);
    }

    startMaestro(primaryAgent);
  });

program.parse();

function showAgentSelection() {
  console.log(chalk.cyan.bold('\n🎭 Agent Maestro - Collaborative AI CLI\n'));
  console.log('Available agents:\n');
  
  Object.values(AGENTS).forEach(agent => {
    console.log(chalk.yellow(`  ${agent.name.padEnd(10)}`), chalk.gray(agent.description));
  });

  console.log(chalk.cyan('\nUsage:'));
  console.log(chalk.white('  maestro --agent <name>\n'));
  console.log(chalk.gray('Example:'));
  console.log(chalk.white('  maestro --agent gemini\n'));
}

function startMaestro(primaryAgent) {
  const maestro = new MaestroCLI(primaryAgent, AGENTS);
  maestro.start();
}

