/**
 * Types for live subagent detection
 * Simplified - no delegation orchestration
 */

export interface SubagentDetection {
  agent: 'codex-delegator' | 'gemini-delegator';
  timestamp: number;
  detected: boolean;
}
