/**
 * Maestro Core - Message-based orchestrator (non-interactive)
 */

import { PTYManager } from './pty-manager.js';
import { DelegationHandler } from './delegation-handler.js';
import { ConversationManager } from './conversation-manager.js';
import { DetailedLogger } from '../utils/detailed-logger.js';
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
      inactivityTimeout: config.inactivityTimeout || 60000,  // 60s without output = timeout
      maxDelegationDepth: config.maxDelegationDepth || 3,
      showSpinner: config.showSpinner !== false,
      verbose: config.verbose || false
    };

    this.ptyManager = new PTYManager();
    this.delegationHandler = new DelegationHandler({
      inactivityTimeout: this.config.inactivityTimeout,
      maxDepth: this.config.maxDelegationDepth,
      showSpinner: this.config.showSpinner
    });

    this.conversationManager = new ConversationManager(this.primaryAgent.displayName);
    this.detailedLogger = new DetailedLogger(this.primaryAgent, this.config);
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

    // Log user message
    this.detailedLogger.logUserMessage(userMessage);

    // Add user message to conversation
    this.conversationManager.addUserMessage(userMessage);

    // Show spinner
    const spinner = this.config.showSpinner ? new SmartSpinner() : null;
    if (spinner) {
      spinner.start(`${this.primaryAgent.displayName}: thinking...`, 'magenta');
    }

    const startTime = Date.now();

    try {
      // Execute primary agent (pass spinner for dynamic updates)
      const response = await this.executePrimaryAgent(userMessage, spinner);

      const duration = Date.now() - startTime;

      // Stop spinner
      if (spinner) {
        spinner.succeed(`${this.primaryAgent.displayName}: completed (${(duration / 1000).toFixed(1)}s)`);
      }

      // Log assistant response
      this.detailedLogger.logAssistantResponse(
        this.primaryAgent.displayName,
        response.content,
        true // cleaned
      );

      // Add assistant message to conversation
      this.conversationManager.addAssistantMessage(response.content, this.primaryAgent.displayName);

      return response;

    } catch (error) {
      if (spinner) {
        spinner.fail(`Error: ${error.message}`);
      }

      // Log error
      this.detailedLogger.logError(error, {
        userMessage,
        agent: this.primaryAgent.displayName
      });

      throw error;
    }
  }

  /**
   * Execute primary agent with message
   */
  async executePrimaryAgent(message, spinner = null) {
    return new Promise((resolve, reject) => {
      const agentId = `primary-${Date.now()}`;
      let output = '';
      let buffer = '';  // Buffer for incomplete JSON lines
      const delegations = [];
      let lastStatus = '';
      let finalResponse = '';  // Store the actual response text
      let inactivityTimer = null;  // Track inactivity timeout

      try {
        // Determine how to invoke the agent with streaming
        const promptMethod = this.primaryAgent.flags?.prompt || '-p';
        const streamFlags = this.primaryAgent.flags?.stream;

        let args;

        if (promptMethod === 'exec') {
          // Codex: codex exec "message" --json
          args = ['exec', message];
          if (streamFlags) {
            args.push(...(Array.isArray(streamFlags) ? streamFlags : [streamFlags]));
          }
        } else if (promptMethod === '--print') {
          // Claude: claude --print "message" --output-format stream-json --verbose
          args = [promptMethod, message];
          if (streamFlags) {
            args.push(...(Array.isArray(streamFlags) ? streamFlags : [streamFlags]));
          }
        } else {
          // Gemini: gemini -p "message" (no streaming support)
          args = [promptMethod, message];
        }

        // Log agent invocation
        this.detailedLogger.logAgentInvocation(
          agentId,
          this.primaryAgent.name,
          this.primaryAgent.command,
          args
        );

        // Spawn agent process
        this.ptyManager.spawn(agentId, this.primaryAgent.command, args);

        // Start inactivity timer
        const startInactivityTimer = () => {
          if (inactivityTimer) {
            clearTimeout(inactivityTimer);
          }
          inactivityTimer = setTimeout(() => {
            this.ptyManager.kill(agentId);
            reject(new Error(`Agent inactive for ${this.config.inactivityTimeout}ms without output`));
          }, this.config.inactivityTimeout);
        };

        // Start the timer initially
        startInactivityTimer();

        // Collect output and update spinner
        this.ptyManager.onData(agentId, async (data) => {
          output += data;
          buffer += data;

          // Reset inactivity timer on every data received
          startInactivityTimer();

          // Log raw output
          this.detailedLogger.logRawOutput(agentId, data);

          // Try to parse JSONL events for streaming updates
          if (streamFlags && spinner) {
            const lines = buffer.split('\n');
            // Keep the last incomplete line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.trim()) {
                try {
                  const event = JSON.parse(line);

                  // Log parsed event
                  this.detailedLogger.logParsedEvent(agentId, event);

                  // Debug: log the event type
                  if (this.config.verbose) {
                    Logger.debug(`Event: ${event.type}`);
                  }

                  const status = this.extractStatusFromEvent(event, this.primaryAgent.name);

                  if (status) {
                    // Log status update
                    this.detailedLogger.logStatusUpdate(agentId, status, 'streaming');

                    if (this.config.verbose) {
                      Logger.debug(`Status update: ${status}`);
                    }
                    spinner.text = `${this.primaryAgent.displayName}: ${status}`;
                    lastStatus = status;
                  }

                  // Extract final response from events
                  const response = this.extractResponseFromEvent(event, this.primaryAgent.name);
                  if (response) {
                    finalResponse = response;
                  }
                } catch (error) {
                  // Not valid JSON, might be non-streaming output
                  // Fall back to text parsing
                  if (!streamFlags) {
                    const status = this.extractAgentStatus(output);
                    if (status && status !== lastStatus) {
                      this.detailedLogger.logStatusUpdate(agentId, status, 'fallback');
                      spinner.text = `${this.primaryAgent.displayName}: ${status}`;
                      lastStatus = status;
                    }
                  }
                }
              }
            }
          } else if (spinner) {
            // Non-streaming mode: use text parsing with tool detection
            const toolStatus = this.extractToolUsageFromText(output);
            const status = toolStatus || this.extractAgentStatus(output);

            if (status && status !== lastStatus) {
              this.detailedLogger.logStatusUpdate(agentId, status, 'fallback');
              spinner.text = `${this.primaryAgent.displayName}: ${status}`;
              lastStatus = status;
            }
          }

          // Check for delegation requests in real-time
          const lines = output.split('\n');
          for (const line of lines) {
            if (isDelegationRequest(line)) {
              try {
                const delegation = await this.processDelegation(line);
                delegations.push(delegation);
                Logger.maestro(`Delegation completed: ${delegation.toAgent}`);
              } catch (error) {
                // Log silently to detailed logger, don't spam console
                this.detailedLogger.logError(error, {
                  line: line.substring(0, 100),
                  context: 'delegation_parsing'
                });
              }
            }
          }
        });

        // Handle process exit
        this.ptyManager.onExit(agentId, ({ exitCode }) => {
          // Clear inactivity timer on exit
          if (inactivityTimer) {
            clearTimeout(inactivityTimer);
          }

          const duration = Date.now() - Date.parse(agentId.split('-')[1]);

          // Log agent exit
          this.detailedLogger.logAgentExit(agentId, exitCode, duration);

          if (exitCode === 0 || output.length > 0) {
            // Use finalResponse from streaming if available, otherwise clean output
            const responseContent = finalResponse || this.cleanOutput(output);

            resolve({
              agent: this.primaryAgent.displayName,
              content: responseContent,
              delegations,
              exitCode
            });
          } else {
            const error = new Error(`Agent exited with code ${exitCode}`);
            this.detailedLogger.logError(error, { agentId, exitCode });
            reject(error);
          }

          // Cleanup
          this.ptyManager.kill(agentId);
        });

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
      const error = new Error(`Unknown agent: ${request.agent}`);
      this.detailedLogger.logError(error, { request });
      throw error;
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

    // Log delegation
    this.detailedLogger.logDelegation(
      this.primaryAgent.displayName,
      request.agent,
      request.prompt,
      result
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
   * Extract status from streaming JSONL event
   */
  extractStatusFromEvent(event, agentName) {
    if (agentName === 'codex') {
      // Codex events: {"type":"item.completed","item":{"type":"reasoning","text":"..."}}
      if (event.type === 'turn.started') {
        return 'starting...';
      }

      // Handle item.started for command_execution (tool usage in progress)
      if (event.type === 'item.started' && event.item) {
        if (event.item.type === 'command_execution' && event.item.command) {
          const cmd = event.item.command;
          // Extract meaningful action from command

          // Check for sed (reading files)
          if (cmd.includes('sed ')) {
            const fileMatch = cmd.match(/\s([^\s"']+\.(?:md|js|json|ts|tsx|jsx|py|java|go|rs|c|cpp|h|txt|yaml|yml|xml|html|css|sh))/i);
            if (fileMatch) {
              const file = fileMatch[1].split('/').pop();  // Get filename only
              return `reading: ${file.substring(0, 40)}`;
            }
            return 'reading file...';
          }

          // Check for cat, head, tail (reading files)
          if (cmd.includes('cat ') || cmd.includes('head ') || cmd.includes('tail ')) {
            const fileMatch = cmd.match(/(?:cat|head|tail)\s+([^\s'"]+)/);
            if (fileMatch) {
              const file = fileMatch[1].split('/').pop();  // Get filename only
              return `reading: ${file.substring(0, 40)}`;
            }
            return 'reading file...';
          }

          // Check for grep, find, ls (searching)
          if (cmd.includes('grep ') || cmd.includes('find ') || cmd.includes('ls ')) {
            return 'searching files...';
          }

          // Check for editors (editing)
          if (cmd.includes('vim ') || cmd.includes('nano ') || cmd.includes('edit ')) {
            return 'editing file...';
          }

          return `executing: ${cmd.substring(0, 40)}`;
        }
      }

      if (event.type === 'item.completed' && event.item) {
        if (event.item.type === 'reasoning') {
          const text = event.item.text || '';
          return `thinking: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`;
        }
        if (event.item.type === 'tool_call') {
          return `using tool: ${event.item.name || 'unknown'}`;
        }
        if (event.item.type === 'agent_message') {
          return 'responding...';
        }
      }
      if (event.type === 'turn.completed') {
        return 'completed';
      }
    } else if (agentName === 'claude') {
      // Claude events: {"type":"assistant","message":{...}}
      if (event.type === 'system' && event.subtype === 'init') {
        return 'initializing...';
      }
      if (event.type === 'assistant' && event.message) {
        return 'responding...';
      }
      if (event.type === 'result') {
        return 'completed';
      }
    } else if (agentName === 'gemini') {
      // Gemini events: {"type":"init|message|tool_use|tool_result|error|result",...}
      if (event.type === 'init') {
        return 'initializing...';
      }
      if (event.type === 'message') {
        return 'thinking...';
      }
      if (event.type === 'tool_use' && event.tool) {
        return `using tool: ${event.tool.name || 'unknown'}`;
      }
      if (event.type === 'tool_result') {
        return 'processing tool result...';
      }
      if (event.type === 'error') {
        return 'error occurred';
      }
      if (event.type === 'result') {
        return 'completed';
      }
    }
    return null;
  }

  /**
   * Extract final response from streaming event
   */
  extractResponseFromEvent(event, agentName) {
    if (agentName === 'codex') {
      // Codex: extract text from agent_message item
      if (event.type === 'item.completed' && event.item?.type === 'agent_message') {
        return event.item.text || '';
      }
    } else if (agentName === 'claude') {
      // Claude: extract content from assistant message
      if (event.type === 'assistant' && event.message?.content) {
        const content = event.message.content;
        if (Array.isArray(content)) {
          return content.map(c => c.text || '').join('');
        }
        return content.text || content;
      }
    } else if (agentName === 'gemini') {
      // Gemini: extract response from result event
      if (event.type === 'result' && event.response) {
        return event.response;
      }
      // Or from message event if it contains the text
      if (event.type === 'message' && event.text) {
        return event.text;
      }
    }
    return null;
  }

  /**
   * Extract tool usage from text output (for dynamic spinner)
   */
  extractToolUsageFromText(output) {
    // Codex tool patterns (non-JSONL fallback)
    if (output.match(/Reading\s+(?:file:\s*)?([^\n]+)/i)) {
      const match = output.match(/Reading\s+(?:file:\s*)?([^\n]+)/i);
      const file = match[1].trim().split(' ')[0]; // First word is filename
      return `reading: ${file.substring(0, 40)}`;
    }

    if (output.match(/Writing\s+(?:file:\s*)?([^\n]+)/i)) {
      const match = output.match(/Writing\s+(?:file:\s*)?([^\n]+)/i);
      const file = match[1].trim().split(' ')[0];
      return `writing: ${file.substring(0, 40)}`;
    }

    if (output.match(/Using\s+(\w+)\s+tool/i)) {
      const match = output.match(/Using\s+(\w+)\s+tool/i);
      return `using ${match[1].toLowerCase()} tool`;
    }

    if (output.match(/Editing\s+(?:file:\s*)?([^\n]+)/i)) {
      const match = output.match(/Editing\s+(?:file:\s*)?([^\n]+)/i);
      const file = match[1].trim().split(' ')[0];
      return `editing: ${file.substring(0, 40)}`;
    }

    if (output.match(/Executing:\s*([^\n]+)/i)) {
      const match = output.match(/Executing:\s*([^\n]+)/i);
      const cmd = match[1].substring(0, 40);
      return `executing: ${cmd}`;
    }

    return null;
  }

  /**
   * Extract agent status from output for spinner (fallback for non-streaming)
   */
  extractAgentStatus(output) {
    // Codex patterns
    if (output.includes('thinking') && output.includes('user')) {
      const thinkingMatch = output.match(/thinking\n([^\n]+)/);
      if (thinkingMatch) {
        return `thinking: ${thinkingMatch[1].substring(0, 50)}...`;
      }
      return 'thinking...';
    }

    // Tool usage patterns
    if (output.match(/Using tool:|Tool:|Calling:/i)) {
      const toolMatch = output.match(/(?:Using tool|Tool|Calling):\s*([^\n]+)/i);
      if (toolMatch) {
        return `using tool: ${toolMatch[1].substring(0, 40)}`;
      }
      return 'using tools...';
    }

    // Reading/writing files
    if (output.match(/Reading|Writing|Editing/i)) {
      const fileMatch = output.match(/(Reading|Writing|Editing)[^\n]*/i);
      if (fileMatch) {
        return fileMatch[0].substring(0, 50).toLowerCase();
      }
    }

    // Gemini specific
    if (output.includes('Connecting to MCP')) {
      return 'connecting to MCP servers...';
    }

    // Default
    return 'thinking...';
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

    // Remove Codex metadata header and footer
    if (cleaned.includes('OpenAI Codex')) {
      // Remove header: everything from "OpenAI Codex" until actual answer
      cleaned = cleaned.replace(/OpenAI Codex v[\d.]+[^\n]*\n-+\n[\s\S]*?\n-+\nuser\n[^\n]+\n\nthinking\n[^\n]+\ncodex\n/g, '');

      // Remove footer: "tokens used" line and number
      cleaned = cleaned.replace(/\ntokens used\n[\d,]+\n?/g, '');

      // Remove any remaining "codex" label at start
      if (cleaned.startsWith('codex\n')) {
        cleaned = cleaned.substring(6);
      }
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
      isRunning: this.isRunning,
      detailedLog: this.detailedLogger.generateSummary()
    };
  }

  /**
   * Get detailed logger instance
   */
  getDetailedLogger() {
    return this.detailedLogger;
  }
}

export default Maestro;
