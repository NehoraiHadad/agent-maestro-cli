/**
 * Delegation Protocol
 * Defines how agents communicate delegation requests
 */

// Protocol constants
export const DELEGATION_PREFIX = 'MAESTRO_DELEGATE::';
export const DELEGATION_RESULT_PREFIX = '[MAESTRO_RESULT]';
export const DELEGATION_ERROR_PREFIX = '[MAESTRO_ERROR]';

/**
 * Parse delegation request from output line
 * Format: MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "task description", "priority": "high"}
 */
export function parseDelegationRequest(line) {
  if (!line.includes(DELEGATION_PREFIX)) {
    return null;
  }

  try {
    const jsonStart = line.indexOf(DELEGATION_PREFIX) + DELEGATION_PREFIX.length;
    const jsonStr = line.substring(jsonStart).trim();
    const request = JSON.parse(jsonStr);

    // Validate required fields
    if (!request.agent || !request.prompt) {
      throw new Error('Missing required fields: agent and prompt');
    }

    return {
      agent: request.agent,
      prompt: request.prompt,
      priority: request.priority || 'normal',
      timeout: request.timeout || null,
      metadata: request.metadata || {}
    };
  } catch (error) {
    throw new Error(`Failed to parse delegation request: ${error.message}`);
  }
}

/**
 * Create delegation request string
 */
export function createDelegationRequest(agent, prompt, options = {}) {
  const request = {
    agent,
    prompt,
    priority: options.priority || 'normal',
    ...(options.timeout && { timeout: options.timeout }),
    ...(options.metadata && { metadata: options.metadata })
  };

  return `${DELEGATION_PREFIX}${JSON.stringify(request)}`;
}

/**
 * Format delegation result for primary agent
 */
export function formatDelegationResult(agentName, result, success = true) {
  const prefix = success ? DELEGATION_RESULT_PREFIX : DELEGATION_ERROR_PREFIX;
  return `\n${prefix}\nAgent: ${agentName}\n${'='.repeat(60)}\n${result}\n${'='.repeat(60)}\n`;
}

/**
 * Check if line contains delegation request
 */
export function isDelegationRequest(line) {
  return line.includes(DELEGATION_PREFIX);
}

/**
 * Validate delegation request
 */
export function validateDelegationRequest(request) {
  const errors = [];

  if (!request.agent) {
    errors.push('Missing agent name');
  }

  if (!request.prompt) {
    errors.push('Missing prompt');
  }

  if (request.priority && !['low', 'normal', 'high'].includes(request.priority)) {
    errors.push('Invalid priority (must be: low, normal, or high)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
