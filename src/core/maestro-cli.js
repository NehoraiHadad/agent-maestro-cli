/**
 * Maestro CLI - Custom CLI interface for Maestro
 */

import readline from 'readline';
import chalk from 'chalk';
import { Logger } from '../utils/logger.js';

export class MaestroCLI {
  constructor(maestro) {
    this.maestro = maestro;
    this.rl = null;
    this.isRunning = false;
  }

  /**
   * Start CLI interface
   */
  async start() {
    this.showWelcome();
    this.setupReadline();
    this.isRunning = true;
    this.showPrompt();
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    Logger.header('🎭 Maestro CLI');
    console.log('');
    Logger.info(`Primary agent: ${chalk.bold(this.maestro.primaryAgent.displayName)}`);
    Logger.info(`Available for delegation: ${chalk.cyan(this.maestro.availableAgents.join(', '))}`);
    console.log('');
    Logger.separator();
    console.log('');
    console.log(chalk.gray('  Type your message and press Enter'));
    console.log(chalk.gray('  Type /help for commands'));
    console.log(chalk.gray('  Type /exit to quit'));
    console.log('');
    Logger.separator();
    console.log('');
  }

  /**
   * Setup readline interface
   */
  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.magenta.bold('[Maestro] > ')
    });

    this.rl.on('line', async (input) => {
      await this.handleInput(input.trim());
    });

    this.rl.on('close', () => {
      this.stop();
    });

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      console.log('');
      Logger.info('Use /exit to quit');
      this.showPrompt();
    });
  }

  /**
   * Handle user input
   */
  async handleInput(input) {
    if (!input) {
      this.showPrompt();
      return;
    }

    // Handle commands
    if (input.startsWith('/')) {
      await this.handleCommand(input);
      return;
    }

    // Send message to Maestro
    try {
      console.log(''); // Empty line before response

      const response = await this.maestro.sendMessage(input);

      // Display response
      this.displayResponse(response);

    } catch (error) {
      Logger.error(`Error: ${error.message}`);
    }

    console.log(''); // Empty line after response
    this.showPrompt();
  }

  /**
   * Handle CLI commands
   */
  async handleCommand(input) {
    const [command, ...args] = input.slice(1).split(' ');

    switch (command.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;

      case 'exit':
      case 'quit':
        await this.stop();
        break;

      case 'clear':
        console.clear();
        this.showWelcome();
        break;

      case 'history':
        this.showHistory(args[0] ? parseInt(args[0]) : 10);
        break;

      case 'stats':
        this.showStats();
        break;

      case 'reset':
        this.maestro.conversationManager.clear();
        Logger.success('Conversation history cleared');
        break;

      case 'save':
        await this.saveConversation(args[0]);
        break;

      default:
        Logger.warn(`Unknown command: ${command}`);
        console.log(chalk.gray('  Type /help for available commands'));
    }

    console.log('');
    this.showPrompt();
  }

  /**
   * Display agent response
   */
  displayResponse(response) {
    const agentName = response.agent || this.maestro.primaryAgent.displayName;
    const agentColor = this.getAgentColor(agentName);

    console.log(agentColor(`[${agentName}]`));
    console.log(response.content);

    // Show delegations if any
    if (response.delegations && response.delegations.length > 0) {
      console.log('');
      Logger.delegation('Delegations', 'Delegations performed:');
      response.delegations.forEach((del, i) => {
        console.log(chalk.cyan(`  ${i + 1}. ${del.fromAgent} → ${del.toAgent}`));
        console.log(chalk.gray(`     ${del.prompt}`));
      });
    }
  }

  /**
   * Get color for agent
   */
  getAgentColor(agentName) {
    const colors = {
      'Claude Code': chalk.hex('#D97757'),
      'Gemini CLI': chalk.hex('#4285F4'),
      'OpenAI Codex': chalk.hex('#10A37F')
    };
    return colors[agentName] || chalk.blue;
  }

  /**
   * Show help
   */
  showHelp() {
    console.log('');
    console.log(chalk.bold('Available Commands:'));
    console.log('');
    console.log(chalk.cyan('  /help') + '          Show this help message');
    console.log(chalk.cyan('  /exit') + '          Exit Maestro');
    console.log(chalk.cyan('  /clear') + '         Clear screen');
    console.log(chalk.cyan('  /history [n]') + '   Show last n messages (default: 10)');
    console.log(chalk.cyan('  /stats') + '         Show conversation statistics');
    console.log(chalk.cyan('  /reset') + '         Clear conversation history');
    console.log(chalk.cyan('  /save [file]') + '   Save conversation to file (default: logs/conversation-{timestamp}.json)');
    console.log('');
  }

  /**
   * Save conversation to file
   */
  async saveConversation(filename) {
    try {
      // Generate default filename if not provided
      if (!filename) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        filename = `logs/conversation-${timestamp}.json`;
      }

      // Ensure logs directory exists
      const fs = await import('fs/promises');
      const path = await import('path');
      const dir = path.dirname(filename);

      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (e) {
        // Directory already exists, ignore
      }

      // Save conversation
      await this.maestro.conversationManager.saveToFile(filename);

      Logger.success(`Conversation saved to: ${filename}`);
    } catch (error) {
      Logger.error(`Failed to save conversation: ${error.message}`);
    }
  }

  /**
   * Show conversation history
   */
  showHistory(count = 10) {
    const history = this.maestro.conversationManager.getLastMessages(count);

    console.log('');
    console.log(chalk.bold(`Last ${history.length} messages:`));
    console.log('');

    history.forEach((entry, i) => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString();

      if (entry.role === 'user') {
        console.log(chalk.green(`[${timestamp}] You:`));
        console.log(chalk.gray(`  ${entry.content}`));
      } else if (entry.role === 'assistant') {
        const agentColor = this.getAgentColor(entry.agent);
        console.log(agentColor(`[${timestamp}] ${entry.agent}:`));
        console.log(chalk.gray(`  ${entry.content.substring(0, 100)}${entry.content.length > 100 ? '...' : ''}`));
      } else if (entry.role === 'delegation') {
        console.log(chalk.cyan(`[${timestamp}] Delegation: ${entry.fromAgent} → ${entry.toAgent}`));
      }

      console.log('');
    });
  }

  /**
   * Show conversation stats
   */
  showStats() {
    const stats = this.maestro.conversationManager.getSummary();

    console.log('');
    console.log(chalk.bold('Conversation Statistics:'));
    console.log('');
    console.log(chalk.gray('  Session ID:       ') + stats.sessionId);
    console.log(chalk.gray('  Primary Agent:    ') + chalk.cyan(stats.primaryAgent));
    console.log(chalk.gray('  Total Messages:   ') + stats.totalMessages);
    console.log(chalk.gray('  User Messages:    ') + stats.userMessages);
    console.log(chalk.gray('  Agent Messages:   ') + stats.assistantMessages);
    console.log(chalk.gray('  Delegations:      ') + stats.delegations);
    console.log(chalk.gray('  Duration:         ') + Math.floor(stats.duration / 1000) + 's');
    console.log('');
  }

  /**
   * Show prompt
   */
  showPrompt() {
    if (this.isRunning && this.rl) {
      this.rl.prompt();
    }
  }

  /**
   * Stop CLI
   */
  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    console.log('');
    Logger.info('Shutting down Maestro...');

    // Cleanup
    if (this.rl) {
      this.rl.close();
    }

    // Cleanup Maestro
    if (this.maestro) {
      await this.maestro.stop();
    }

    console.log('');
    Logger.success('Goodbye! 👋');
    console.log('');

    process.exit(0);
  }
}

export default MaestroCLI;
