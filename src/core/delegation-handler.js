/**
 * Delegation Handler - Executes delegation requests to secondary agents
 */

import { PTYManager } from './pty-manager.js';
import { getAgent } from '../agents/agent-config.js';
import { formatDelegationResult } from '../protocols/delegation-protocol.js';
import {
  AgentNotFoundError,
  DelegationTimeoutError,
  MaxDelegationDepthError,
  DelegationError
} from './errors.js';
import { Logger } from '../utils/logger.js';
import { SmartSpinner } from '../utils/smart-spinner.js';

export class DelegationHandler {
  constructor(config = {}) {
    this.ptyManager = new PTYManager();
    this.config = {
      inactivityTimeout: config.inactivityTimeout || 60000, // 60s without output
      maxDepth: config.maxDepth || 3,
      showSpinner: config.showSpinner !== false
    };
    this.currentDepth = 0;
    this.delegationCount = 0;
  }

  /**
   * Execute a delegation to a secondary agent
   */
  async execute(agentName, prompt, options = {}) {
    // Check depth limit
    this.currentDepth++;
    if (this.currentDepth > this.config.maxDepth) {
      this.currentDepth--;
      throw new MaxDelegationDepthError(this.config.maxDepth);
    }

    try {
      const agent = getAgent(agentName);
      const delegationId = `delegation-${++this.delegationCount}`;
      const inactivityTimeout = options.inactivityTimeout || this.config.inactivityTimeout;

      Logger.delegation(agent.displayName, 'Starting task');

      const spinner = this.config.showSpinner ? new SmartSpinner() : null;
      if (spinner) {
        spinner.start(`${agent.displayName} is working...`, 'cyan');
      }

      const result = await this.runDelegation(delegationId, agent, prompt, inactivityTimeout);

      if (spinner) {
        spinner.succeed(`${agent.displayName} completed task`);
      }

      Logger.delegation(agent.displayName, 'Task completed');

      this.currentDepth--;
      return formatDelegationResult(agent.displayName, result, true);
    } catch (error) {
      this.currentDepth--;

      if (error instanceof DelegationTimeoutError) {
        Logger.warn(`Delegation to ${agentName} timed out`);
        return formatDelegationResult(agentName, `Timeout: ${error.message}`, false);
      }

      Logger.error(`Delegation failed: ${error.message}`);
      return formatDelegationResult(agentName, `Error: ${error.message}`, false);
    }
  }

  /**
   * Run a single delegation
   */
  async runDelegation(id, agent, prompt, inactivityTimeout) {
    return new Promise((resolve, reject) => {
      let result = '';
      let inactivityTimer = null;

      // Start inactivity timer
      const startInactivityTimer = () => {
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
        }
        inactivityTimer = setTimeout(() => {
          this.ptyManager.kill(id);
          reject(new DelegationTimeoutError(agent.name, inactivityTimeout));
        }, inactivityTimeout);
      };

      // Spawn process with appropriate non-interactive method
      try {
        const promptMethod = agent.flags?.prompt || '-p';
        let args;

        // Codex uses 'exec' subcommand, others use '-p' flag
        if (promptMethod === 'exec') {
          args = ['exec', prompt];
        } else {
          args = [promptMethod, prompt];
        }

        this.ptyManager.spawn(id, agent.command, args);

        // Start inactivity timer initially
        startInactivityTimer();

        // Handle data
        this.ptyManager.onData(id, (data) => {
          result += data;
          // Reset inactivity timer on every data received
          startInactivityTimer();
        });

        // Handle exit
        this.ptyManager.onExit(id, ({ exitCode }) => {
          // Clear inactivity timer on exit
          if (inactivityTimer) {
            clearTimeout(inactivityTimer);
          }

          if (exitCode === 0 || result.length > 0) {
            resolve(this.cleanOutput(result));
          } else {
            reject(new DelegationError(`Agent exited with code ${exitCode}`, agent.name));
          }

          // Cleanup
          this.ptyManager.cleanup();
        });
      } catch (error) {
        if (inactivityTimer) {
          clearTimeout(inactivityTimer);
        }
        reject(new DelegationError(error.message, agent.name));
      }
    });
  }

  /**
   * Clean output from ANSI codes and control characters
   */
  cleanOutput(output) {
    // Remove ANSI escape codes
    let cleaned = output.replace(/\x1B\[[0-9;]*[JKmsu]/g, '');

    // Remove excessive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Execute multiple delegations in parallel
   */
  async executeParallel(delegations) {
    Logger.maestro(`Executing ${delegations.length} delegations in parallel`);

    const promises = delegations.map(({ agent, prompt, options }) =>
      this.execute(agent, prompt, options)
        .catch(error => ({
          error: true,
          agent,
          message: error.message
        }))
    );

    const results = await Promise.all(promises);

    return results;
  }

  /**
   * Get current delegation depth
   */
  getDepth() {
    return this.currentDepth;
  }

  /**
   * Get delegation count
   */
  getCount() {
    return this.delegationCount;
  }

  /**
   * Reset depth and count
   */
  reset() {
    this.currentDepth = 0;
    this.delegationCount = 0;
    return this;
  }

  /**
   * Cleanup all processes
   */
  cleanup() {
    this.ptyManager.killAll();
    this.reset();
    return this;
  }
}

export default DelegationHandler;
