import * as pty from 'node-pty';
import { DELEGATION_PREFIX } from '../config.js';
import { Logger } from '../utils/logger.js';
import { Delegator } from './delegator.js';
import { getSystemPrompt } from '../prompts/system-prompts.js';

/**
 * Maestro orchestrator - manages primary agent and delegation flow
 */
export class Maestro {
  constructor(primaryAgent, availableAgents) {
    this.primaryAgent = primaryAgent;
    this.availableAgents = availableAgents;
    this.primaryProcess = null;
    this.buffer = '';
    this.delegator = new Delegator(availableAgents);
    this.isFirstInput = true;
  }

  start() {
    this.showWelcome();
    
    this.primaryProcess = pty.spawn(this.primaryAgent.command, [], {
      name: 'xterm-color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 30,
      cwd: process.cwd(),
      env: process.env
    });

    this.primaryProcess.onData((data) => this.handleOutput(data));
    this.primaryProcess.onExit(({ exitCode }) => {
      Logger.info(`Session ended`);
      process.exit(exitCode);
    });

    process.stdin.setRawMode(true);
    process.stdin.on('data', (data) => this.handleInput(data));
    
    process.stdout.on('resize', () => {
      this.primaryProcess.resize(process.stdout.columns, process.stdout.rows);
    });

    this.setupCleanup();
  }

  showWelcome() {
    Logger.success(`Primary agent: ${this.primaryAgent.name}`);
    Logger.info('Agent aware of Maestro delegation capabilities');
    Logger.info('Available for delegation: ' + 
      Object.keys(this.availableAgents).filter(a => a !== this.primaryAgent.name).join(', '));
    console.log('');
  }

  handleInput(data) {
    // On first user input, prepend system context
    if (this.isFirstInput) {
      this.isFirstInput = false;
      const systemPrompt = getSystemPrompt(this.primaryAgent.name);
      this.primaryProcess.write(`${systemPrompt}\n\nUser request: `);
    }
    this.primaryProcess.write(data);
  }

  handleOutput(data) {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop();

    for (const line of lines) {
      if (line.includes(DELEGATION_PREFIX)) {
        this.processDelegation(line);
      } else {
        process.stdout.write(line + '\n');
      }
    }
  }

  async processDelegation(line) {
    try {
      const jsonStart = line.indexOf(DELEGATION_PREFIX) + DELEGATION_PREFIX.length;
      const jsonStr = line.substring(jsonStart).trim();
      const { agent, prompt } = JSON.parse(jsonStr);

      const result = await this.delegator.execute(agent, prompt);
      
      const response = `\n[Result from ${agent}]\n${result}\n[End of delegation]\n`;
      this.primaryProcess.write(response);
    } catch (error) {
      Logger.error(`Delegation parsing failed: ${error.message}`);
    }
  }

  setupCleanup() {
    const cleanup = () => {
      if (this.primaryProcess) {
        this.primaryProcess.kill();
      }
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }
}
