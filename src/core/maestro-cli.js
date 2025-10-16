import readline from 'readline';
import chalk from 'chalk';
import { AgentExecutor } from './agent-executor.js';
import { Logger } from '../utils/logger.js';
import { ConversationLogger } from '../utils/conversation-logger.js';

/**
 * Interactive CLI interface for Maestro
 */
export class MaestroCLI {
  constructor(primaryAgent, availableAgents) {
    this.primaryAgent = primaryAgent;
    this.availableAgents = availableAgents;
    this.executor = new AgentExecutor(primaryAgent);
    this.conversationHistory = [];
    this.conversationLogger = new ConversationLogger(primaryAgent.name);
    this.rl = null;
  }

  start() {
    this.showWelcome();
    this.setupReadline();
    this.prompt();
  }

  showWelcome() {
    console.clear();
    console.log(chalk.cyan.bold('\n🎭 Agent Maestro - Collaborative AI CLI\n'));
    console.log(chalk.green('━'.repeat(60)));
    console.log(chalk.yellow(`Primary Agent: ${this.primaryAgent.name}`));
    console.log(chalk.gray(`Available for delegation: ${
      Object.keys(this.availableAgents)
        .filter(a => a !== this.primaryAgent.name)
        .join(', ')
    }`));
    console.log(chalk.green('━'.repeat(60)));
    console.log(chalk.gray('\nType your request, or:\n'));
    console.log(chalk.white('  /help     - Show help'));
    console.log(chalk.white('  /agents   - List agents'));
    console.log(chalk.white('  /test     - Test agent connection'));
    console.log(chalk.white('  /logs     - Show log summary'));
    console.log(chalk.white('  /clear    - Clear screen'));
    console.log(chalk.white('  /exit     - Exit Maestro\n'));
  }

  setupReadline() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('You > ')
    });

    this.rl.on('line', (input) => this.handleInput(input.trim()));
    this.rl.on('close', () => this.exit());
  }

  prompt() {
    this.rl.prompt();
  }

  async handleInput(input) {
    if (!input) {
      this.prompt();
      return;
    }

    // Handle commands
    if (input.startsWith('/')) {
      this.handleCommand(input);
      return;
    }

    // Process user request
    await this.processRequest(input);
  }

  handleCommand(command) {
    const cmd = command.toLowerCase().split(' ')[0];
    this.conversationLogger.logCommand(command);

    switch (cmd) {
      case '/help':
        this.showHelp();
        break;
      case '/agents':
        this.listAgents();
        break;
      case '/test':
        this.testAgent();
        break;
      case '/clear':
        console.clear();
        this.showWelcome();
        break;
      case '/logs':
        this.showLogInfo();
        break;
      case '/exit':
        this.exit();
        break;
      default:
        console.log(chalk.red(`Unknown command: ${command}`));
    }
    this.prompt();
  }

  async processRequest(userInput) {
    this.conversationHistory.push({ role: 'user', content: userInput });
    this.conversationLogger.logUserInput(userInput);

    try {
      // Check if delegation is needed
      const delegationNeeded = await this.analyzeForDelegation(userInput);
      
      let response;
      if (delegationNeeded) {
        response = await this.handleCollaboration(userInput);
      } else {
        this.conversationLogger.logAgentExecution(this.primaryAgent.name, userInput);
        response = await this.executor.execute(userInput);
        this.conversationLogger.logAgentResponse(this.primaryAgent.name, response);
      }

      this.conversationHistory.push({ role: 'assistant', content: response });
      
      console.log(chalk.green(`\n${this.primaryAgent.name} > `), response);
      console.log('');
    } catch (error) {
      Logger.error(`Execution failed: ${error.message}`);
      this.conversationLogger.logError(error.message, { 
        input: userInput, 
        agent: this.primaryAgent.name 
      });
    }

    this.prompt();
  }

  async analyzeForDelegation(input) {
    const keywords = ['both', 'compare', 'multiple', 'also use', 'and ask'];
    return keywords.some(kw => input.toLowerCase().includes(kw));
  }

  async handleCollaboration(input) {
    Logger.delegation('multiple agents', 'Collaboration mode activated');
    
    const results = await Promise.all(
      Object.values(this.availableAgents).map(agent => 
        new AgentExecutor(agent).execute(input).catch(err => 
          `[${agent.name} error: ${err.message}]`
        )
      )
    );

    let combined = '\n--- Collaborative Response ---\n\n';
    Object.keys(this.availableAgents).forEach((name, i) => {
      combined += `${name.toUpperCase()}:\n${results[i]}\n\n`;
    });

    return combined;
  }

  showHelp() {
    console.log(chalk.cyan('\n📚 Maestro Help:\n'));
    console.log('  • Ask questions naturally');
    console.log('  • Maestro decides when to use multiple agents');
    console.log('  • Use keywords like "compare", "both" for multi-agent response\n');
  }

  listAgents() {
    console.log(chalk.cyan('\n🤖 Available Agents:\n'));
    Object.values(this.availableAgents).forEach(agent => {
      const marker = agent.name === this.primaryAgent.name ? '→' : ' ';
      console.log(`  ${marker} ${chalk.yellow(agent.name.padEnd(10))} ${chalk.gray(agent.description)}`);
    });
    console.log('');
  }

  async testAgent() {
    console.log(chalk.cyan('\n🔍 Testing agent connection...\n'));
    
    try {
      const testPrompt = 'Hello, this is a test. Please respond with "OK"';
      const response = await this.executor.execute(testPrompt, 10000);
      
      console.log(chalk.green(`✓ ${this.primaryAgent.name} is working!`));
      console.log(chalk.gray(`  Response: ${response.substring(0, 100)}${response.length > 100 ? '...' : ''}`));
    } catch (error) {
      console.log(chalk.red(`✗ ${this.primaryAgent.name} test failed: ${error.message}`));
      console.log(chalk.yellow(`  Make sure ${this.primaryAgent.command} is installed and working`));
    }
    console.log('');
  }

  showLogInfo() {
    const summary = this.conversationLogger.getSummary();
    console.log(chalk.cyan('\n📊 Session Log Summary:\n'));
    console.log(`  Session ID: ${chalk.yellow(summary.sessionId)}`);
    console.log(`  User inputs: ${chalk.green(summary.userInputs)}`);
    console.log(`  Agent executions: ${chalk.blue(summary.agentExecutions)}`);
    console.log(`  Errors: ${chalk.red(summary.errors)}`);
    console.log(`  Delegations: ${chalk.magenta(summary.delegations)}`);
    console.log(`  Log file: ${chalk.gray(summary.logFile)}\n`);
  }

  exit() {
    this.conversationLogger.logSessionEnd();
    const summary = this.conversationLogger.getSummary();
    
    console.log(chalk.cyan('\n📊 Session Summary:'));
    console.log(chalk.gray(`  Total interactions: ${summary.totalInteractions}`));
    console.log(chalk.gray(`  Log saved to: ${summary.logFile}`));
    console.log(chalk.cyan('\n👋 Goodbye!\n'));
    process.exit(0);
  }
}

