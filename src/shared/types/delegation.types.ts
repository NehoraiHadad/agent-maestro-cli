/**
 * Types for delegation protocol
 */

export type DelegationPriority = 'low' | 'normal' | 'high';

export interface DelegationRequest {
  agent: string;
  prompt: string;
  priority: DelegationPriority;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface DelegationOptions {
  priority?: DelegationPriority;
  timeout?: number;
  inactivityTimeout?: number;
  metadata?: Record<string, unknown>;
}

export interface DelegationContext {
  depth: number;
  maxDepth: number;
  parentAgent?: string;
  requestId: string;
}

export interface FormattedDelegationResult {
  success: boolean;
  agent: string;
  content: string;
  formatted: string;
}
