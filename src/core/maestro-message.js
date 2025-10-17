/**
 * Maestro Core - Message-based orchestrator (non-interactive)
 */

import { PTYManager } from './pty-manager.js';
import { DelegationHandler } from './delegation-handler.js';
import { ConversationManager } from './conversation-manager.js';
import { getAgent, getAllAgents } from '../agents/agent-config.js';
import {
  parseDelegationRequest,
  isDelegationRequest
} from '../protocols/delegation-protocol.js';
import { Logger } from '../utils/logger.js';
import { SmartSpinner } from '../utils/smart-spinner.js';

export class Maestro {
  constructor(primaryAgentName, config = {}) {
    this.primaryAgent = getAgent(primaryAgentName);
    this.config = {
      delegationTimeout: config.delegationTimeout || 60000,
      maxDelegationDepth: config.maxDelegationDepth || 3,
      showSpinner: config.showSpinner !== false,
      verbose: config.verbose || false
    };

    this.ptyManager = new PTYManager();
    this.delegationHandler = new DelegationHandler({
      timeout: this.config.delegationTimeout,
      maxDepth: this.config.maxDelegationDepth,
      showSpinner: this.config.showSpinner
    });

    this.conversationManager = new ConversationManager(this.primaryAgent.displayName);
    this.availableAgents = this.getAvailableAgents();
    this.isRunning = false;
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
   * Start Maestro
   */
  async start() {
    this.isRunning = true;
    Logger.debug('Maestro message-based mode started');
  }

  /**
   * Send message to primary agent and get response
   */
  async sendMessage(userMessage) {
    if (!this.isRunning) {
      throw new Error('Maestro is not running');
    }

    // Add user message to conversation
    this.conversationManager.addUserMessage(userMessage);

    // Show spinner
    const spinner = this.config.showSpinner ? new SmartSpinner() : null;
    if (spinner) {
      spinner.start(`${this.primaryAgent.displayName} is thinking...`, 'magenta');
    }

    try {
      // Execute primary agent
      const response = await this.executePrimaryAgent(userMessage);

      // Stop spinner
      if (spinner) {
        spinner.succeed(`${this.primaryAgent.displayName} responded`);
      }

      // Add assistant message to conversation
      this.conversationManager.addAssistantMessage(response.content, this.primaryAgent.displayName);

      return response;

    } catch (error) {
      if (spinner) {
        spinner.fail(`Error: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Execute primary agent with message
   */
  async executePrimaryAgent(message) {
    return new Promise((resolve, reject) => {
      const agentId = `primary-${Date.now()}`;
      let output = '';
      const delegations = [];

      try {
        // Determine how to invoke the agent
        const promptMethod = this.primaryAgent.flags?.prompt || '-p';
        let args;

        if (promptMethod === 'exec') {
          args = ['exec', message];
        } else {
          args = [promptMethod, message];
        }

        // Spawn agent process
        this.ptyManager.spawn(agentId, this.primaryAgent.command, args);

        // Collect output
        this.ptyManager.onData(agentId, async (data) => {
          output += data;

          // Check for delegation requests in real-time
          const lines = output.split('\n');
          for (const line of lines) {
            if (isDelegationRequest(line)) {
              try {
                const delegation = await this.processDelegation(line);
                delegations.push(delegation);
              } catch (error) {
                Logger.error(`Delegation failed: ${error.message}`);
              }
            }
          }
        });

        // Handle process exit
        this.ptyManager.onExit(agentId, ({ exitCode }) => {
          if (exitCode === 0 || output.length > 0) {
            // Clean output
            const cleanedOutput = this.cleanOutput(output);

            resolve({
              agent: this.primaryAgent.displayName,
              content: cleanedOutput,
              delegations,
              exitCode
            });
          } else {
            reject(new Error(`Agent exited with code ${exitCode}`));
          }

          // Cleanup
          this.ptyManager.kill(agentId);
        });

        // Set timeout
        const timeout = setTimeout(() => {
          this.ptyManager.kill(agentId);
          reject(new Error(`Primary agent timed out after ${this.config.delegationTimeout}ms`));
        }, this.config.delegationTimeout);

        // Clear timeout on exit
        this.ptyManager.onExit(agentId, () => clearTimeout(timeout));

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Process delegation request
   */
  async processDelegation(line) {
    const request = parseDelegationRequest(line);

    // Validate agent exists
    if (!this.availableAgents.includes(request.agent)) {
      throw new Error(`Unknown agent: ${request.agent}`);
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

    // Add to conversation history
    this.conversationManager.addDelegationEvent(
      this.primaryAgent.displayName,
      request.agent,
      request.prompt,
      result
    );

    return {
      fromAgent: this.primaryAgent.displayName,
      toAgent: request.agent,
      prompt: request.prompt,
      result
    };
  }

  /**
   * Clean output from ANSI codes and formatting
   */
  cleanOutput(output) {
    // Remove ANSI escape codes
    let cleaned = output.replace(/\x1B\[[0-9;]*[JKmsu]/g, '');
    cleaned = cleaned.replace(/\x1B\][0-9;]*;[^\x07]*\x07/g, '');
    cleaned = cleaned.replace(/\x1B\[[^m]*m/g, '');
    cleaned = cleaned.replace(/\x1B\[[\d;]*[a-zA-Z]/g, '');

    // Remove delegation protocol lines
    cleaned = cleaned.replace(/MAESTRO_DELEGATE::[^\n]*/g, '');

    // Remove Codex metadata header
    if (cleaned.includes('OpenAI Codex')) {
      // Remove everything from "OpenAI Codex" until "codex" answer line
      cleaned = cleaned.replace(/OpenAI Codex.*?(?=\ncodex\n)/s, '');
      // Remove the "codex" label line
      cleaned = cleaned.replace(/\ncodex\n/, '\n');
      // Remove "tokens used" footer
      cleaned = cleaned.replace(/\ntokens used\n[\d,]+/, '');
    }

    // Remove Gemini "Loaded cached credentials" line
    cleaned = cleaned.replace(/Loaded cached credentials\.\n?/g, '');

    // Remove excessive newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Stop Maestro
   */
  async stop() {
    this.isRunning = false;

    // Cleanup
    this.ptyManager.killAll();
    this.delegationHandler.cleanup();

    Logger.debug('Maestro stopped');
  }

  /**
   * Get conversation statistics
   */
  getStats() {
    return {
      ...this.conversationManager.getSummary(),
      primaryAgent: this.primaryAgent.name,
      availableAgents: this.availableAgents,
      isRunning: this.isRunning
    };
  }
}

export default Maestro;
