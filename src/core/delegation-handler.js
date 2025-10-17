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
      timeout: config.timeout || 60000, // 60 seconds default
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
      const timeout = options.timeout || this.config.timeout;

      Logger.delegation(agent.displayName, 'Starting task');

      const spinner = this.config.showSpinner ? new SmartSpinner() : null;
      if (spinner) {
        spinner.start(`${agent.displayName} is working...`, 'cyan');
      }

      const result = await this.runDelegation(delegationId, agent, prompt, timeout);

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
  async runDelegation(id, agent, prompt, timeout) {
    return new Promise((resolve, reject) => {
      let result = '';
      let timeoutId;

      // Spawn process with -p flag for non-interactive execution
      try {
        const promptFlag = agent.flags?.prompt || '-p';
        const args = [promptFlag, prompt];

        this.ptyManager.spawn(id, agent.command, args);

        // Handle data
        this.ptyManager.onData(id, (data) => {
          result += data;
        });

        // Handle exit
        this.ptyManager.onExit(id, ({ exitCode }) => {
          clearTimeout(timeoutId);

          if (exitCode === 0 || result.length > 0) {
            resolve(this.cleanOutput(result));
          } else {
            reject(new DelegationError(`Agent exited with code ${exitCode}`, agent.name));
          }

          // Cleanup
          this.ptyManager.cleanup();
        });

        // Set timeout
        timeoutId = setTimeout(() => {
          this.ptyManager.kill(id);
          reject(new DelegationTimeoutError(agent.name, timeout));
        }, timeout);
      } catch (error) {
        clearTimeout(timeoutId);
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
