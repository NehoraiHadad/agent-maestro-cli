/**
 * Types for live subagent detection and delegation analytics
 */

export interface SubagentDetection {
  agent: 'codex-delegator' | 'gemini-delegator';
  timestamp: number;
  detected: boolean;
}

/**
 * Delegation event for analytics tracking
 */
export interface DelegationEvent {
  id: string;
  from: string;
  to: string;
  task: string;
  timestamp: number;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Delegation pattern for analytics
 */
export interface DelegationPattern {
  pattern: string;
  count: number;
  agents: string[];
  avgDuration: number;
  successRate: number;
}

/**
 * Delegation statistics
 */
export interface DelegationStats {
  totalDelegations: number;
  byAgent: Record<string, number>;
  avgDuration: number;
  successRate: number;
  commonPatterns: DelegationPattern[];
}

/**
 * Analytics report
 */
export interface AnalyticsReport {
  generatedAt: Date;
  timeRange: {
    start: Date;
    end: Date;
  };
  stats: DelegationStats;
  topAgents: Array<{
    agent: string;
    count: number;
    successRate: number;
    avgDuration: number;
  }>;
  recentDelegations: DelegationEvent[];
}
