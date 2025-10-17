/**
 * DelegationOrchestrator - Orchestrates the entire delegation workflow
 *
 * This is the main integration point that:
 * 1. Monitors agent output for delegation requests
 * 2. Validates and parses delegation requests
 * 3. Executes delegations using the Delegator
 * 4. Returns results to the requesting agent
 */

import type { AgentName } from '../../shared/types/index.js';
import { AgentRepository } from '../../domain/repositories/index.js';
import { Delegator } from './Delegator.js';
import { AgentSelector } from './AgentSelector.js';
import { DelegationProtocolParser, type ParsedDelegation } from './DelegationProtocolParser.js';
import { RequestValidator } from './RequestValidator.js';
import { ConsoleLogger } from '../ui/index.js';

/**
 * Delegation execution result
 */
export interface DelegationResult {
  success: boolean;
  agent: AgentName;
  task: string;
  result?: string;
  error?: string;
  duration?: number;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  maxDepth?: number;
  inactivityTimeout?: number;
  autoSuggest?: boolean;  // Suggest agent if not specified
  logDelegations?: boolean;
}

/**
 * Main delegation orchestrator
 */
export class DelegationOrchestrator {
  private delegator: Delegator;
  private parser: DelegationProtocolParser;
  private selector: AgentSelector;
  private validator: RequestValidator;
  private agentRepository: AgentRepository;
  private logger: ConsoleLogger;
  private config: Required<OrchestratorConfig>;
  private currentAgent: AgentName | null = null;

  constructor(config: OrchestratorConfig = {}) {
    this.config = {
      maxDepth: config.maxDepth ?? 3,
      inactivityTimeout: config.inactivityTimeout ?? 120000,
      autoSuggest: config.autoSuggest ?? true,
      logDelegations: config.logDelegations ?? true
    };

    this.delegator = new Delegator({
      maxDepth: this.config.maxDepth,
      inactivityTimeout: this.config.inactivityTimeout
    });

    this.parser = new DelegationProtocolParser();
    this.selector = new AgentSelector();
    this.validator = new RequestValidator();
    this.agentRepository = new AgentRepository();
    this.logger = new ConsoleLogger();
  }

  /**
   * Set the current agent (for context-aware suggestions)
   */
  setCurrentAgent(agentName: AgentName): void {
    this.currentAgent = agentName;
  }

  /**
   * Process agent output and handle any delegation requests
   *
   * @param output - The raw output from the agent
   * @returns Object with cleaned output and delegation results
   */
  async processOutput(output: string): Promise<{
    cleanOutput: string;
    delegations: DelegationResult[];
    hasDelegations: boolean;
  }> {
    // Check if output contains delegation requests
    if (!this.parser.hasDelegations(output)) {
      return {
        cleanOutput: output,
        delegations: [],
        hasDelegations: false
      };
    }

    // Parse delegation requests
    const parseResult = this.parser.parse(output);

    if (parseResult.hasErrors && this.config.logDelegations) {
      this.logger.warn('Delegation parsing errors:');
      for (const error of parseResult.errors) {
        this.logger.error(`  - ${error}`);
      }
    }

    // Execute all delegations
    const results: DelegationResult[] = [];

    // Execute individual delegations sequentially
    for (const delegation of parseResult.delegations) {
      const result = await this.executeSingleDelegation(delegation);
      results.push(result);
    }

    // Execute parallel groups
    for (const group of parseResult.parallelGroups) {
      const groupResults = await this.executeParallelDelegations(group.delegations);
      results.push(...groupResults);
    }

    // Remove delegation markers from output
    const cleanOutput = this.parser.stripDelegations(output);

    return {
      cleanOutput,
      delegations: results,
      hasDelegations: true
    };
  }

  /**
   * Suggest the best agent for a task (without executing)
   */
  suggestAgent(task: string): {
    agent: AgentName;
    confidence: number;
    reason: string;
  } {
    const selection = this.selector.selectAgent(task, this.currentAgent ?? undefined);
    return {
      agent: selection.agent,
      confidence: selection.confidence,
      reason: selection.reason
    };
  }

  /**
   * Execute a single delegation
   */
  private async executeSingleDelegation(
    delegation: ParsedDelegation
  ): Promise<DelegationResult> {
    const startTime = Date.now();

    try {
      // Validate the delegation request
      const validation = this.validator.validate({
        agent: delegation.agent,
        prompt: delegation.task,
        priority: delegation.priority || 'normal'
      });

      if (!validation.valid) {
        return {
          success: false,
          agent: delegation.agent,
          task: delegation.task,
          error: validation.errors.join(', '),
          duration: Date.now() - startTime
        };
      }

      // Get the agent
      const agent = this.agentRepository.findByName(delegation.agent);

      // Log delegation start
      if (this.config.logDelegations) {
        this.logger.info(`Delegating to ${agent.displayName}...`);
        this.logger.debug(`Task: ${delegation.task.substring(0, 100)}${delegation.task.length > 100 ? '...' : ''}`);
      }

      // Execute the delegation
      const result = await this.delegator.execute(agent, delegation.task, {
        priority: delegation.priority,
        timeout: delegation.timeout,
        inactivityTimeout: this.config.inactivityTimeout
      });

      const duration = Date.now() - startTime;

      // Log delegation completion
      if (this.config.logDelegations) {
        this.logger.success(`Delegation to ${agent.displayName} completed in ${(duration / 1000).toFixed(1)}s`);
      }

      return {
        success: true,
        agent: delegation.agent,
        task: delegation.task,
        result,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (this.config.logDelegations) {
        this.logger.error(`Delegation to ${delegation.agent} failed: ${errorMessage}`);
      }

      return {
        success: false,
        agent: delegation.agent,
        task: delegation.task,
        error: errorMessage,
        duration
      };
    }
  }

  /**
   * Execute multiple delegations in parallel
   */
  private async executeParallelDelegations(
    delegations: ParsedDelegation[]
  ): Promise<DelegationResult[]> {
    if (this.config.logDelegations) {
      this.logger.info(`Executing ${delegations.length} delegations in parallel...`);
    }

    const promises = delegations.map(delegation =>
      this.executeSingleDelegation(delegation)
    );

    return Promise.all(promises);
  }

  /**
   * Format delegation results for display
   */
  formatResults(results: DelegationResult[]): string {
    if (results.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push('\n' + '='.repeat(60));
    lines.push('Delegation Results');
    lines.push('='.repeat(60));

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      lines.push(`\n[${i + 1}] ${result.agent.toUpperCase()}`);
      lines.push(`Task: ${result.task.substring(0, 80)}${result.task.length > 80 ? '...' : ''}`);
      lines.push(`Status: ${result.success ? '✅ Success' : '❌ Failed'}`);

      if (result.duration) {
        lines.push(`Duration: ${(result.duration / 1000).toFixed(1)}s`);
      }

      if (result.success && result.result) {
        lines.push(`\nResult:`);
        lines.push(result.result.substring(0, 500));
        if (result.result.length > 500) {
          lines.push(`... (${result.result.length - 500} more characters)`);
        }
      }

      if (!result.success && result.error) {
        lines.push(`Error: ${result.error}`);
      }

      if (i < results.length - 1) {
        lines.push('\n' + '-'.repeat(60));
      }
    }

    lines.push('\n' + '='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Get delegation statistics
   */
  getStats(): {
    currentDepth: number;
    maxDepth: number;
  } {
    return {
      currentDepth: this.delegator.getDepth(),
      maxDepth: this.config.maxDepth
    };
  }

  /**
   * Generate system prompt for agents
   * This should be added to the agent's system prompt
   */
  static generateSystemPrompt(): string {
    return `
# Delegation System

You can delegate tasks to specialized agents using this protocol:

## Available Agents:

1. **Claude** - Best for:
   - Complex architecture and design
   - Refactoring and code restructuring
   - Security audits and vulnerability analysis
   - Deep codebase analysis (1M token context)
   - Enterprise-grade solutions

2. **Codex** - Best for:
   - Fast code generation (90.2% HumanEval)
   - Rapid prototyping
   - Unit test creation
   - Algorithm implementation
   - Quick fixes and debugging

3. **Gemini** - Best for:
   - Web research and data gathering
   - Browser automation
   - Workflow automation
   - Content generation
   - Cost-effective solutions

## Delegation Protocol:

**Simple delegation:**
\`\`\`
[[DELEGATE:agent_name]]
Task description here
[[/DELEGATE]]
\`\`\`

**Advanced delegation with options:**
\`\`\`
[[DELEGATE:agent_name priority=high timeout=30000]]
Task description here
[[/DELEGATE]]
\`\`\`

**Parallel delegations:**
\`\`\`
[[DELEGATE_PARALLEL]]
[[DELEGATE:codex]]Task 1[[/DELEGATE]]
[[DELEGATE:codex]]Task 2[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]
\`\`\`

## When to Delegate:

- Delegate when a task is better suited for another agent's specialization
- Consider delegation for tasks outside your core strengths
- Use parallel delegation for independent tasks
- Maximum delegation depth is 3 levels

## Examples:

User: "Analyze the authentication system and implement improvements"
You: "I'll break this into two parts:

First, I'll delegate the analysis to Claude who excels at security analysis:
[[DELEGATE:claude]]
Analyze the authentication system architecture for security vulnerabilities and improvement opportunities
[[/DELEGATE]]

Then I can implement the recommended improvements based on the analysis results."

---

User: "Create a new feature with tests and documentation"
You: "I'll delegate these tasks in parallel for efficiency:
[[DELEGATE_PARALLEL]]
[[DELEGATE:codex]]Implement the feature with clean, tested code[[/DELEGATE]]
[[DELEGATE:gemini]]Generate comprehensive documentation[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]"
`;
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    this.delegator.cleanup();
  }
}
