#!/usr/bin/env node

/**
 * AgentMaestro CLI Entry Point
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { Maestro } from './core/maestro-message.js';
import { MaestroCLI } from './core/maestro-cli.js';
import { showAgentMenu } from './cli/interactive-menu.js';
import { getAgent, checkAgentAvailability, getAllAgents } from './agents/agent-config.js';
import { Logger } from './utils/logger.js';
import { AgentNotAvailableError } from './core/errors.js';

const program = new Command();

program
  .name('maestro')
  .description('🎭 Multi-agent AI orchestration CLI')
  .version('1.0.0');

// Main command - agent selection
program
  .option('-a, --agent <name>', 'specify primary agent (claude, gemini, codex)')
  .option('-v, --verbose', 'enable verbose logging')
  .option('--no-spinner', 'disable loading spinners')
  .option('--timeout <ms>', 'delegation timeout in milliseconds', '60000')
  .option('--max-depth <n>', 'maximum delegation depth', '3')
  .action(async (options) => {
    try {
      let agentName = options.agent;

      // If no agent specified, show interactive menu
      if (!agentName) {
        agentName = await showAgentMenu();
      }

      // Validate agent
      const agent = getAgent(agentName);

      // Check availability
      const available = await checkAgentAvailability(agentName);
      if (!available) {
        throw new AgentNotAvailableError(agentName, agent.packageName);
      }

      // Set verbose logging
      if (options.verbose) {
        Logger.setLevel(Logger.levels.DEBUG);
      }

      // Create Maestro
      const maestro = new Maestro(agentName, {
        delegationTimeout: parseInt(options.timeout),
        maxDelegationDepth: parseInt(options.maxDepth),
        showSpinner: options.spinner,
        verbose: options.verbose
      });

      await maestro.start();

      // Create and start CLI
      const cli = new MaestroCLI(maestro);
      await cli.start();
    } catch (error) {
      Logger.error(error.message);

      if (error instanceof AgentNotAvailableError) {
        console.log('');
        console.log(chalk.yellow('Install with:'));
        console.log(`  npm install -g ${error.packageName}`);
      }

      process.exit(1);
    }
  });

// List command - show available agents
program
  .command('list')
  .description('list all available agents')
  .action(async () => {
    Logger.header('🎭 Available Agents');

    const agents = getAllAgents();

    for (const agent of agents) {
      const available = await checkAgentAvailability(agent.name);
      const status = available ? chalk.green('✓ installed') : chalk.red('✗ not installed');

      console.log('');
      console.log(chalk.bold(agent.displayName) + ` ${status}`);
      console.log(`  ${chalk.gray(agent.description)}`);
      console.log(`  ${chalk.cyan('Package:')} ${agent.packageName}`);
      console.log(`  ${chalk.cyan('Command:')} ${agent.command}`);
    }

    console.log('');
  });

// Info command - show info about specific agent
program
  .command('info <agent>')
  .description('show information about a specific agent')
  .action(async (agentName) => {
    try {
      const agent = getAgent(agentName);
      const available = await checkAgentAvailability(agentName);

      Logger.header(`🎭 ${agent.displayName}`);

      console.log(chalk.bold('Description:'));
      console.log(`  ${agent.description}`);
      console.log('');

      console.log(chalk.bold('Status:'));
      console.log(`  ${available ? chalk.green('✓ Installed') : chalk.red('✗ Not installed')}`);
      console.log('');

      console.log(chalk.bold('Package:'));
      console.log(`  ${agent.packageName}`);
      console.log('');

      console.log(chalk.bold('Command:'));
      console.log(`  ${agent.command}`);
      console.log('');

      console.log(chalk.bold('Capabilities:'));
      agent.capabilities.forEach(cap => {
        console.log(`  • ${cap}`);
      });
      console.log('');

      console.log(chalk.bold('Authentication:'));
      console.log(`  ${agent.authType}`);
      console.log('');

      if (!available) {
        console.log(chalk.yellow('Installation:'));
        console.log(`  npm install -g ${agent.packageName}`);
        console.log('');
      }
    } catch (error) {
      Logger.error(error.message);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);
