/**
 * Maestro Core - Main orchestrator for multi-agent coordination
 */

import * as pty from 'node-pty';
import { DelegationHandler } from './delegation-handler.js';
import { getAgent, getAllAgents } from '../agents/agent-config.js';
import {
  parseDelegationRequest,
  isDelegationRequest
} from '../protocols/delegation-protocol.js';
import { Logger } from '../utils/logger.js';
import { AgentNotFoundError } from './errors.js';

export class Maestro {
  constructor(primaryAgentName, config = {}) {
    this.primaryAgent = getAgent(primaryAgentName);
    this.config = {
      delegationTimeout: config.delegationTimeout || 60000,
      maxDelegationDepth: config.maxDelegationDepth || 3,
      showSpinner: config.showSpinner !== false,
      verbose: config.verbose || false
    };

    this.primaryProcess = null;
    this.delegationHandler = new DelegationHandler({
      timeout: this.config.delegationTimeout,
      maxDepth: this.config.maxDelegationDepth,
      showSpinner: this.config.showSpinner
    });

    this.buffer = '';
    this.isRunning = false;
    this.availableAgents = this.getAvailableAgents();
  }

  /**
   * Get list of available agents (excluding primary)
   */
  getAvailableAgents() {
    return getAllAgents()
      .filter(agent => agent.name !== this.primaryAgent.name)
      .map(agent => agent.name);
  }

  /**
   * Start Maestro orchestration
   */
  async start() {
    this.showWelcome();

    try {
      // Spawn primary agent
      this.primaryProcess = pty.spawn(this.primaryAgent.command, [], {
        name: 'xterm-color',
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 30,
        cwd: process.cwd(),
        env: process.env
      });

      this.isRunning = true;

      // Setup event handlers
      this.setupEventHandlers();

      // Setup cleanup
      this.setupCleanup();

      // Setup stdin
      this.setupStdin();

      // Handle terminal resize
      this.setupResize();

      Logger.success('Maestro orchestration started');
      Logger.separator();
    } catch (error) {
      Logger.error(`Failed to start Maestro: ${error.message}`);
      process.exit(1);
    }
  }

  /**
   * Show welcome message
   */
  showWelcome() {
    Logger.header('🎭 Agent Maestro');

    Logger.info(`Primary agent: ${this.primaryAgent.displayName}`);
    Logger.info(`Available for delegation: ${this.availableAgents.join(', ')}`);

    Logger.separator();

    // Show delegation protocol hint
    console.log('');
    Logger.maestro('Delegation Protocol:');
    console.log('  Primary agent can delegate tasks using:');
    console.log('  MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "task description"}');
    console.log('');
    Logger.separator();
  }

  /**
   * Setup event handlers for primary agent
   */
  setupEventHandlers() {
    // Handle output from primary agent
    this.primaryProcess.onData((data) => {
      this.handleOutput(data);
    });

    // Handle exit
    this.primaryProcess.onExit(({ exitCode, signal }) => {
      this.isRunning = false;
      Logger.separator();
      Logger.info(`Session ended (code: ${exitCode})`);

      // Cleanup
      this.delegationHandler.cleanup();

      process.exit(exitCode);
    });
  }

  /**
   * Handle output from primary agent
   */
  async handleOutput(data) {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // Keep last incomplete line in buffer

    for (const line of lines) {
      // Check for delegation request
      if (isDelegationRequest(line)) {
        await this.processDelegation(line);
      } else {
        // Pass through to stdout
        process.stdout.write(line + '\n');
      }
    }
  }

  /**
   * Process delegation request
   */
  async processDelegation(line) {
    try {
      const request = parseDelegationRequest(line);

      // Validate agent exists
      if (!this.availableAgents.includes(request.agent)) {
        throw new AgentNotFoundError(request.agent);
      }

      Logger.maestro(`Delegating to ${request.agent}`);

      // Execute delegation
      const result = await this.delegationHandler.execute(
        request.agent,
        request.prompt,
        {
          timeout: request.timeout,
          priority: request.priority
        }
      );

      // Send result back to primary agent
      this.primaryProcess.write(result);
    } catch (error) {
      Logger.error(`Delegation failed: ${error.message}`);

      // Send error back to primary agent
      const errorMessage = `\n[MAESTRO_ERROR] ${error.message}\n`;
      this.primaryProcess.write(errorMessage);
    }
  }

  /**
   * Setup stdin handling
   */
  setupStdin() {
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (data) => {
      if (this.isRunning && this.primaryProcess) {
        this.primaryProcess.write(data);
      }
    });
  }

  /**
   * Setup terminal resize handling
   */
  setupResize() {
    process.stdout.on('resize', () => {
      if (this.primaryProcess) {
        this.primaryProcess.resize(
          process.stdout.columns,
          process.stdout.rows
        );
      }
    });
  }

  /**
   * Setup cleanup on exit
   */
  setupCleanup() {
    const cleanup = () => {
      if (this.isRunning) {
        Logger.info('Cleaning up...');

        // Kill primary process
        if (this.primaryProcess) {
          this.primaryProcess.kill();
        }

        // Cleanup delegation handler
        this.delegationHandler.cleanup();

        this.isRunning = false;
      }
    };

    // Handle various exit signals
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });

    process.on('exit', () => {
      cleanup();
    });
  }

  /**
   * Get delegation statistics
   */
  getStats() {
    return {
      primaryAgent: this.primaryAgent.name,
      delegationCount: this.delegationHandler.getCount(),
      currentDepth: this.delegationHandler.getDepth(),
      isRunning: this.isRunning
    };
  }
}

export default Maestro;
