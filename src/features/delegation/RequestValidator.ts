/**
 * Request Validator - validates delegation requests
 */
import type { DelegationRequest, DelegationPriority } from '../../shared/types/index.js';
import { AGENT_NAMES } from '../../shared/constants/index.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates delegation requests to ensure all required fields are present
 * and properly formatted before execution.
 */
export class RequestValidator {
  private readonly validAgentNames: string[];
  private readonly validPriorities: DelegationPriority[];

  constructor() {
    this.validAgentNames = Object.values(AGENT_NAMES);
    this.validPriorities = ['low', 'normal', 'high'];
  }

  /**
   * Validate a complete delegation request
   * @param request The delegation request to validate
   * @returns Validation result with errors if any
   */
  validate(request: DelegationRequest): ValidationResult {
    const errors: string[] = [];

    // Check required fields exist
    const missingFields = this.checkRequiredFields(request);
    errors.push(...missingFields);

    // Validate individual fields if present
    if (request.agent && !this.validateAgent(request.agent)) {
      errors.push(`Invalid agent name: '${request.agent}'. Must be one of: ${this.validAgentNames.join(', ')}`);
    }

    if (request.prompt && !this.validatePrompt(request.prompt)) {
      errors.push('Prompt cannot be empty or whitespace only');
    }

    if (request.priority && !this.validatePriority(request.priority)) {
      errors.push(`Invalid priority: '${request.priority}'. Must be one of: ${this.validPriorities.join(', ')}`);
    }

    if (request.timeout !== undefined && !this.validateTimeout(request.timeout)) {
      errors.push('Timeout must be a positive number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate agent name
   * @param agentName Agent name to validate
   * @returns true if valid agent name
   */
  validateAgent(agentName: string): boolean {
    return this.validAgentNames.includes(agentName);
  }

  /**
   * Validate prompt text
   * @param prompt Prompt text to validate
   * @returns true if prompt is non-empty after trimming
   */
  validatePrompt(prompt: string): boolean {
    return typeof prompt === 'string' && prompt.trim().length > 0;
  }

  /**
   * Validate priority value
   * @param priority Priority to validate
   * @returns true if valid priority
   */
  validatePriority(priority: string): boolean {
    return this.validPriorities.includes(priority as DelegationPriority);
  }

  /**
   * Validate timeout value
   * @param timeout Timeout in milliseconds
   * @returns true if timeout is a positive number
   */
  private validateTimeout(timeout: number): boolean {
    return typeof timeout === 'number' && timeout > 0 && Number.isFinite(timeout);
  }

  /**
   * Check for required fields in request
   * @param request Request object to check
   * @returns Array of error messages for missing fields
   */
  private checkRequiredFields(request: unknown): string[] {
    const errors: string[] = [];

    if (typeof request !== 'object' || request === null) {
      errors.push('Request must be an object');
      return errors;
    }

    const req = request as Record<string, unknown>;

    if (!req.agent) {
      errors.push('Missing required field: agent');
    } else if (typeof req.agent !== 'string') {
      errors.push('Field agent must be a string');
    }

    if (!req.prompt) {
      errors.push('Missing required field: prompt');
    } else if (typeof req.prompt !== 'string') {
      errors.push('Field prompt must be a string');
    }

    if (!req.priority) {
      errors.push('Missing required field: priority');
    } else if (typeof req.priority !== 'string') {
      errors.push('Field priority must be a string');
    }

    return errors;
  }
}
