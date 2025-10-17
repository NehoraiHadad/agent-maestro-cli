/**
 * Interactive CLI menu for agent selection
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import { getAgentsForDisplay, checkAgentAvailability } from '../agents/agent-config.js';
import { Logger } from '../utils/logger.js';

/**
 * Show agent selection menu
 */
export async function showAgentMenu() {
  Logger.header('🎭 Select Primary Agent');

  const agents = getAgentsForDisplay();

  // Check availability
  const availabilityChecks = await Promise.all(
    agents.map(async agent => {
      const available = await checkAgentAvailability(agent.value);
      return { ...agent, available };
    })
  );

  // Format choices with availability status
  const choices = availabilityChecks.map(agent => ({
    name: agent.available
      ? `${chalk.green('✓')} ${agent.name} - ${chalk.gray(agent.description)}`
      : `${chalk.red('✗')} ${agent.name} ${chalk.yellow('(not installed)')} - ${chalk.gray(agent.description)}`,
    value: agent.value,
    disabled: !agent.available
  }));

  // Add help option
  choices.push(new inquirer.Separator());
  choices.push({
    name: chalk.cyan('ℹ  Show installation help'),
    value: '__help__'
  });

  try {
    const answer = await inquirer.prompt([
      {
        type: 'list',
        name: 'agent',
        message: 'Choose your primary agent:',
        choices,
        pageSize: 10
      }
    ]);

    if (answer.agent === '__help__') {
      showInstallationHelp();
      return showAgentMenu(); // Show menu again
    }

    return answer.agent;
  } catch (error) {
    if (error.isTtyError) {
      Logger.error('Interactive mode not supported in this terminal');
      Logger.info('Use: maestro --agent <name>');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Show installation help
 */
function showInstallationHelp() {
  console.log('');
  Logger.header('📦 Agent Installation Guide');

  console.log(chalk.bold('Claude Code:'));
  console.log('  npm install -g @anthropic-ai/claude-code');
  console.log('  Requires: Claude Pro or Max subscription');
  console.log('');

  console.log(chalk.bold('Gemini CLI:'));
  console.log('  npm install -g @google/gemini-cli');
  console.log('  Requires: Google account or AI Studio API key');
  console.log('');

  console.log(chalk.bold('OpenAI Codex:'));
  console.log('  npm install -g @openai/codex');
  console.log('  Requires: ChatGPT account or OPENAI_API_KEY');
  console.log('');

  Logger.separator();
  console.log('');
}

/**
 * Confirm action
 */
export async function confirmAction(message) {
  const answer = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: true
    }
  ]);

  return answer.confirmed;
}

/**
 * Get user input
 */
export async function getInput(message, defaultValue = '') {
  const answer = await inquirer.prompt([
    {
      type: 'input',
      name: 'value',
      message,
      default: defaultValue
    }
  ]);

  return answer.value;
}
