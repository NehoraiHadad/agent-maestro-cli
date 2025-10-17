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
      // Spawn primary agent with proper terminal configuration
      const ptyEnv = {
        ...process.env,
        TERM: process.env.TERM || 'xterm-256color',
        COLORTERM: 'truecolor',
        // Ensure the agent knows it's in a terminal
        FORCE_COLOR: '1',
        CLICOLOR_FORCE: '1',
        // Prevent issues with cursor position queries
        NO_COLOR_CURSOR: '1',
        // Some CLIs check this to avoid complex terminal queries
        CI: undefined,  // Unset CI mode if it was set
        TERM_PROGRAM: 'maestro'
      };

      this.primaryProcess = pty.spawn(this.primaryAgent.command, [], {
        name: process.env.TERM || 'xterm-256color',
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 30,
        cwd: process.cwd(),
        env: ptyEnv
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
    // Check for DSR (Device Status Report) query and respond
    // Codex sends \x1b[6n to query cursor position
    if (data.includes('\x1b[6n')) {
      // Respond with cursor position (row 1, col 1)
      this.primaryProcess.write('\x1b[1;1R');
      // Remove DSR query from data before passing through
      data = data.replace(/\x1b\[6n/g, '');
    }

    // Always pass through output immediately for interactive responsiveness
    process.stdout.write(data);

    // Check for delegation requests in the data
    this.buffer += data;

    // Only process complete lines for delegation detection
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop(); // Keep last incomplete line in buffer

    for (const line of lines) {
      // Check for delegation request (but output was already passed through)
      if (isDelegationRequest(line)) {
        // Clear the delegation line from terminal (it was already written)
        process.stdout.write('\r\x1b[K'); // Clear current line
        await this.processDelegation(line);
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
    // Check if stdin is a TTY before setting raw mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      Logger.debug('Raw mode enabled for stdin');
    } else {
      Logger.debug('Stdin is not a TTY, using line mode');
    }

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
