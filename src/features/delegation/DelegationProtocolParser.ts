/**
 * DelegationProtocolParser - Parse delegation requests from agent output
 *
 * Supports multiple delegation formats:
 * - Simple: [[DELEGATE:agent]]task[[/DELEGATE]]
 * - Advanced: [[DELEGATE:agent priority=high]]task[[/DELEGATE]]
 * - Parallel: [[DELEGATE_PARALLEL]]...[[/DELEGATE_PARALLEL]]
 */

import type { AgentName, DelegationPriority } from '../../shared/types/index.js';
import { AGENT_NAMES } from '../../shared/constants/index.js';

/**
 * Parsed delegation request
 */
export interface ParsedDelegation {
  agent: AgentName;
  task: string;
  priority?: DelegationPriority;
  timeout?: number;
  background?: boolean;  // New: run in background while agent continues
  metadata?: Record<string, string>;
}

/**
 * Parsed parallel delegation group
 */
export interface ParallelDelegationGroup {
  delegations: ParsedDelegation[];
  parallel: true;
}

/**
 * Parse result
 */
export interface ParseResult {
  delegations: ParsedDelegation[];
  parallelGroups: ParallelDelegationGroup[];
  hasErrors: boolean;
  errors: string[];
}

/**
 * Protocol patterns
 */
const PATTERNS = {
  // Simple delegation: [[DELEGATE:claude]]task text[[/DELEGATE]]
  simple: /\[\[DELEGATE:([a-z]+)\]\]([\s\S]*?)\[\[\/DELEGATE\]\]/gi,

  // Advanced delegation: [[DELEGATE:claude priority=high timeout=30000]]task[[/DELEGATE]]
  advanced: /\[\[DELEGATE:([a-z]+)\s+([^\]]+)\]\]([\s\S]*?)\[\[\/DELEGATE\]\]/gi,

  // Parallel group: [[DELEGATE_PARALLEL]]...[[/DELEGATE_PARALLEL]]
  parallelGroup: /\[\[DELEGATE_PARALLEL\]\]([\s\S]*?)\[\[\/DELEGATE_PARALLEL\]\]/gi,

  // Extract metadata: key=value pairs
  metadata: /(\w+)=([^\s]+)/g
};

/**
 * Delegation protocol parser
 */
export class DelegationProtocolParser {
  /**
   * Parse text for delegation requests
   */
  parse(text: string): ParseResult {
    const result: ParseResult = {
      delegations: [],
      parallelGroups: [],
      hasErrors: false,
      errors: []
    };

    // Parse parallel groups first
    const parallelGroups = this.parseParallelGroups(text);
    result.parallelGroups = parallelGroups.groups;
    result.errors.push(...parallelGroups.errors);

    // Remove parallel group content to avoid duplicate parsing
    let textWithoutParallel = text;
    for (const match of text.matchAll(PATTERNS.parallelGroup)) {
      textWithoutParallel = textWithoutParallel.replace(match[0], '');
    }

    // Parse individual delegations
    const simpleDelegations = this.parseSimpleDelegations(textWithoutParallel);
    result.delegations.push(...simpleDelegations.delegations);
    result.errors.push(...simpleDelegations.errors);

    const advancedDelegations = this.parseAdvancedDelegations(textWithoutParallel);
    result.delegations.push(...advancedDelegations.delegations);
    result.errors.push(...advancedDelegations.errors);

    result.hasErrors = result.errors.length > 0;

    return result;
  }

  /**
   * Check if text contains delegation requests
   */
  hasDelegations(text: string): boolean {
    return PATTERNS.simple.test(text) ||
           PATTERNS.advanced.test(text) ||
           PATTERNS.parallelGroup.test(text);
  }

  /**
   * Extract text without delegation markers
   */
  stripDelegations(text: string): string {
    return text
      .replace(PATTERNS.parallelGroup, '')
      .replace(PATTERNS.advanced, '')
      .replace(PATTERNS.simple, '')
      .trim();
  }

  /**
   * Parse simple delegation format
   */
  private parseSimpleDelegations(text: string): {
    delegations: ParsedDelegation[];
    errors: string[];
  } {
    const delegations: ParsedDelegation[] = [];
    const errors: string[] = [];

    // Reset regex lastIndex
    PATTERNS.simple.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = PATTERNS.simple.exec(text)) !== null) {
      const [, agentName, task] = match;

      // Validate agent name
      if (!this.isValidAgent(agentName)) {
        errors.push(`Invalid agent name: ${agentName}`);
        continue;
      }

      // Validate task
      const trimmedTask = task.trim();
      if (!trimmedTask) {
        errors.push(`Empty task for agent: ${agentName}`);
        continue;
      }

      delegations.push({
        agent: agentName as AgentName,
        task: trimmedTask
      });
    }

    return { delegations, errors };
  }

  /**
   * Parse advanced delegation format with metadata
   */
  private parseAdvancedDelegations(text: string): {
    delegations: ParsedDelegation[];
    errors: string[];
  } {
    const delegations: ParsedDelegation[] = [];
    const errors: string[] = [];

    // Reset regex lastIndex
    PATTERNS.advanced.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = PATTERNS.advanced.exec(text)) !== null) {
      const [, agentName, metadataString, task] = match;

      // Validate agent name
      if (!this.isValidAgent(agentName)) {
        errors.push(`Invalid agent name: ${agentName}`);
        continue;
      }

      // Validate task
      const trimmedTask = task.trim();
      if (!trimmedTask) {
        errors.push(`Empty task for agent: ${agentName}`);
        continue;
      }

      // Parse metadata
      const metadata = this.parseMetadata(metadataString);

      // Extract known fields
      const delegation: ParsedDelegation = {
        agent: agentName as AgentName,
        task: trimmedTask
      };

      if (metadata.priority && this.isValidPriority(metadata.priority)) {
        delegation.priority = metadata.priority as DelegationPriority;
      }

      if (metadata.timeout) {
        const timeout = parseInt(metadata.timeout, 10);
        if (!isNaN(timeout) && timeout > 0) {
          delegation.timeout = timeout;
        }
      }

      if (metadata.background) {
        delegation.background = metadata.background === 'true';
      }

      // Store remaining metadata
      const { priority, timeout, background, ...rest } = metadata;
      if (Object.keys(rest).length > 0) {
        delegation.metadata = rest;
      }

      delegations.push(delegation);
    }

    return { delegations, errors };
  }

  /**
   * Parse parallel delegation groups
   */
  private parseParallelGroups(text: string): {
    groups: ParallelDelegationGroup[];
    errors: string[];
  } {
    const groups: ParallelDelegationGroup[] = [];
    const errors: string[] = [];

    // Reset regex lastIndex
    PATTERNS.parallelGroup.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = PATTERNS.parallelGroup.exec(text)) !== null) {
      const [, groupContent] = match;

      // Parse delegations within the group
      const simpleDelegations = this.parseSimpleDelegations(groupContent);
      const advancedDelegations = this.parseAdvancedDelegations(groupContent);

      const allDelegations = [
        ...simpleDelegations.delegations,
        ...advancedDelegations.delegations
      ];

      const groupErrors = [
        ...simpleDelegations.errors,
        ...advancedDelegations.errors
      ];

      if (allDelegations.length === 0) {
        errors.push('Empty parallel delegation group');
        continue;
      }

      if (allDelegations.length === 1) {
        errors.push('Parallel group with only one delegation (use simple format instead)');
      }

      groups.push({
        delegations: allDelegations,
        parallel: true
      });

      errors.push(...groupErrors);
    }

    return { groups, errors };
  }

  /**
   * Parse metadata key=value pairs
   */
  private parseMetadata(metadataString: string): Record<string, string> {
    const metadata: Record<string, string> = {};

    // Reset regex lastIndex
    PATTERNS.metadata.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = PATTERNS.metadata.exec(metadataString)) !== null) {
      const [, key, value] = match;
      metadata[key] = value;
    }

    return metadata;
  }

  /**
   * Validate agent name
   */
  private isValidAgent(name: string): boolean {
    return Object.values(AGENT_NAMES).includes(name as AgentName);
  }

  /**
   * Validate priority value
   */
  private isValidPriority(priority: string): boolean {
    return ['low', 'normal', 'high'].includes(priority);
  }

  /**
   * Format delegation for output
   */
  formatDelegation(delegation: ParsedDelegation): string {
    let result = `[[DELEGATE:${delegation.agent}`;

    if (delegation.priority || delegation.timeout || delegation.metadata) {
      const parts: string[] = [];

      if (delegation.priority) {
        parts.push(`priority=${delegation.priority}`);
      }

      if (delegation.timeout) {
        parts.push(`timeout=${delegation.timeout}`);
      }

      if (delegation.metadata) {
        for (const [key, value] of Object.entries(delegation.metadata)) {
          parts.push(`${key}=${value}`);
        }
      }

      result += ' ' + parts.join(' ');
    }

    result += `]]\n${delegation.task}\n[[/DELEGATE]]`;

    return result;
  }

  /**
   * Format parallel delegation group
   */
  formatParallelGroup(group: ParallelDelegationGroup): string {
    const formatted = group.delegations.map(d => this.formatDelegation(d)).join('\n');
    return `[[DELEGATE_PARALLEL]]\n${formatted}\n[[/DELEGATE_PARALLEL]]`;
  }
}
