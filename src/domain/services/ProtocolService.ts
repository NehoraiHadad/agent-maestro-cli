/**
 * Protocol Service - handles delegation protocol operations
 */
import type { DelegationRequest, DelegationPriority } from '../../shared/types/index.js';
import {
  DELEGATION_PREFIX,
  DELEGATION_RESULT_PREFIX,
  DELEGATION_ERROR_PREFIX
} from '../../shared/constants/index.js';
import { DelegationParseError, InvalidDelegationRequestError } from '../../shared/errors/index.js';

export class ProtocolService {
  /**
   * Check if line contains delegation request
   */
  isDelegationRequest(line: string): boolean {
    return line.includes(DELEGATION_PREFIX);
  }

  /**
   * Parse delegation request from line
   */
  parseDelegationRequest(line: string): DelegationRequest {
    if (!line.includes(DELEGATION_PREFIX)) {
      throw new DelegationParseError(line, 'Missing delegation prefix');
    }

    const jsonStart = line.indexOf(DELEGATION_PREFIX) + DELEGATION_PREFIX.length;
    const jsonStr = line.substring(jsonStart).trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (error) {
      throw new DelegationParseError(line, 'Invalid JSON format');
    }

    // Validate and construct request
    const request = this.validateAndConstructRequest(parsed);
    return request;
  }

  /**
   * Validate and construct delegation request
   */
  private validateAndConstructRequest(data: unknown): DelegationRequest {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
      errors.push('Request must be an object');
      throw new InvalidDelegationRequestError(errors, data);
    }

    const obj = data as Record<string, unknown>;

    if (!obj.agent || typeof obj.agent !== 'string') {
      errors.push('Missing or invalid agent field');
    }

    if (!obj.prompt || typeof obj.prompt !== 'string') {
      errors.push('Missing or invalid prompt field');
    }

    if (errors.length > 0) {
      throw new InvalidDelegationRequestError(errors, data);
    }

    const priority = this.validatePriority(obj.priority as string | undefined);

    return {
      agent: obj.agent as string,
      prompt: obj.prompt as string,
      priority,
      timeout: typeof obj.timeout === 'number' ? obj.timeout : undefined,
      metadata: typeof obj.metadata === 'object' && obj.metadata !== null
        ? obj.metadata as Record<string, unknown>
        : undefined
    };
  }

  /**
   * Validate priority value
   */
  private validatePriority(priority?: string): DelegationPriority {
    if (!priority) return 'normal';

    const validPriorities: DelegationPriority[] = ['low', 'normal', 'high'];
    if (validPriorities.includes(priority as DelegationPriority)) {
      return priority as DelegationPriority;
    }

    return 'normal';
  }

  /**
   * Create delegation request string
   */
  createDelegationRequest(
    agent: string,
    prompt: string,
    options?: {
      priority?: DelegationPriority;
      timeout?: number;
      metadata?: Record<string, unknown>;
    }
  ): string {
    const request: Record<string, unknown> = {
      agent,
      prompt,
      priority: options?.priority || 'normal'
    };

    if (options?.timeout) {
      request.timeout = options.timeout;
    }

    if (options?.metadata) {
      request.metadata = options.metadata;
    }

    return `${DELEGATION_PREFIX}${JSON.stringify(request)}`;
  }

  /**
   * Format delegation result
   */
  formatDelegationResult(
    agentName: string,
    result: string,
    success: boolean
  ): string {
    const prefix = success ? DELEGATION_RESULT_PREFIX : DELEGATION_ERROR_PREFIX;
    const separator = '='.repeat(60);

    return [
      '',
      prefix,
      `Agent: ${agentName}`,
      separator,
      result,
      separator,
      ''
    ].join('\n');
  }
}
