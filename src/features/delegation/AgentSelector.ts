/**
 * AgentSelector - Intelligent agent selection based on task analysis
 *
 * Analyzes task descriptions and selects the most appropriate agent
 * based on keywords, patterns, and agent capabilities.
 */

import type { AgentName } from '../../shared/types/index.js';
import { AGENT_NAMES } from '../../shared/constants/index.js';

/**
 * Task classification types
 */
export type TaskType =
  | 'architecture'     // Complex design and planning
  | 'refactoring'      // Code restructuring
  | 'security'         // Security analysis and auditing
  | 'code-generation'  // Writing new code
  | 'prototyping'      // Quick proof of concept
  | 'web-research'     // Internet research
  | 'automation'       // Workflow automation
  | 'debugging'        // Finding and fixing bugs
  | 'testing'          // Creating tests
  | 'general';         // General-purpose tasks

/**
 * Task complexity levels
 */
export type Complexity = 'low' | 'medium' | 'high';

/**
 * Task analysis result
 */
export interface TaskAnalysis {
  keywords: string[];
  taskType: TaskType;
  complexity: Complexity;
  requiresWeb: boolean;
  requiresSpeed: boolean;
  requiresContext: boolean;
  requiresCostEfficiency: boolean;
}

/**
 * Agent selection result with confidence score
 */
export interface AgentSelection {
  agent: AgentName;
  confidence: number;  // 0-1
  reason: string;
  alternatives: Array<{
    agent: AgentName;
    confidence: number;
  }>;
}

/**
 * Keyword mappings for each agent
 */
const KEYWORD_MAPPINGS: Record<AgentName, string[]> = {
  [AGENT_NAMES.CLAUDE]: [
    // Architecture & Design
    'refactor', 'architecture', 'design', 'restructure',
    'organize', 'modular', 'pattern', 'structure',

    // Security
    'security', 'audit', 'vulnerability', 'secure',
    'authentication', 'authorization', 'encryption',

    // Analysis
    'analyze', 'analysis', 'review', 'evaluate',
    'assess', 'examine', 'investigate',

    // Complex tasks
    'complex', 'large-scale', 'enterprise', 'production',
    'codebase', 'system', 'architectural',

    // Deep work
    'detailed', 'comprehensive', 'thorough', 'in-depth'
  ],

  [AGENT_NAMES.CODEX]: [
    // Code generation
    'generate', 'create', 'write', 'implement',
    'build', 'develop', 'code', 'function',

    // Speed
    'quick', 'fast', 'rapid', 'prototype',
    'poc', 'proof of concept', 'demo',

    // Algorithms
    'algorithm', 'solve', 'calculate', 'compute',
    'optimize', 'performance',

    // Testing
    'test', 'unit test', 'testing', 'spec',

    // Completion
    'complete', 'finish', 'suggestion', 'autocomplete',

    // Pair programming
    'help', 'assist', 'pair', 'collaborate',

    // Bug fixing
    'fix', 'bug', 'debug', 'issue', 'problem',
    'resolve', 'patch', 'repair'
  ],

  [AGENT_NAMES.GEMINI]: [
    // Web & Research
    'search', 'research', 'find', 'lookup',
    'google', 'web', 'internet', 'online',
    'scrape', 'crawl', 'fetch',

    // Automation
    'automate', 'automation', 'workflow', 'process',
    'script', 'batch', 'schedule',

    // Browser
    'browser', 'navigate', 'click', 'form',
    'website', 'page', 'url',

    // Content
    'content', 'generate content', 'write content',
    'article', 'report', 'document',

    // Cost-conscious
    'cheap', 'affordable', 'budget', 'cost-effective',

    // Data gathering
    'gather', 'collect', 'aggregate', 'compile'
  ]
};

/**
 * Complexity indicators
 */
const COMPLEXITY_INDICATORS = {
  high: [
    'large-scale', 'enterprise', 'production', 'complex',
    'system', 'architecture', 'multiple', 'entire',
    'comprehensive', 'full', 'complete system'
  ],
  medium: [
    'feature', 'component', 'module', 'service',
    'refactor', 'redesign', 'improve'
  ],
  low: [
    'simple', 'basic', 'quick', 'small', 'fix',
    'tweak', 'minor', 'single'
  ]
};

/**
 * Special requirement indicators
 */
const REQUIREMENT_INDICATORS = {
  web: ['search', 'research', 'web', 'internet', 'online', 'google', 'browser'],
  speed: ['quick', 'fast', 'rapid', 'urgent', 'asap', 'immediately'],
  context: ['analyze', 'review', 'understand', 'codebase', 'existing', 'current'],
  costEfficiency: ['cheap', 'affordable', 'budget', 'cost', 'economical']
};

/**
 * Intelligent agent selector
 */
export class AgentSelector {
  /**
   * Analyze a task description
   */
  analyzeTask(taskDescription: string): TaskAnalysis {
    const normalized = taskDescription.toLowerCase();
    const words = this.tokenize(normalized);

    return {
      keywords: this.extractKeywords(words),
      taskType: this.classifyTask(words),
      complexity: this.assessComplexity(words),
      requiresWeb: this.checkRequirement(words, REQUIREMENT_INDICATORS.web),
      requiresSpeed: this.checkRequirement(words, REQUIREMENT_INDICATORS.speed),
      requiresContext: this.checkRequirement(words, REQUIREMENT_INDICATORS.context),
      requiresCostEfficiency: this.checkRequirement(words, REQUIREMENT_INDICATORS.costEfficiency)
    };
  }

  /**
   * Select the best agent for a task
   */
  selectAgent(taskDescription: string, currentAgent?: AgentName): AgentSelection {
    const analysis = this.analyzeTask(taskDescription);
    const scores = this.calculateScores(analysis, currentAgent);

    // Sort by confidence
    const sortedAgents = Object.entries(scores)
      .map(([agent, confidence]) => ({ agent: agent as AgentName, confidence }))
      .sort((a, b) => b.confidence - a.confidence);

    const best = sortedAgents[0];
    const alternatives = sortedAgents.slice(1, 3);

    return {
      agent: best.agent,
      confidence: best.confidence,
      reason: this.generateReason(best.agent, analysis),
      alternatives
    };
  }

  /**
   * Calculate confidence scores for each agent
   */
  private calculateScores(
    analysis: TaskAnalysis,
    currentAgent?: AgentName
  ): Record<AgentName, number> {
    const scores: Record<AgentName, number> = {
      [AGENT_NAMES.CLAUDE]: 0,
      [AGENT_NAMES.CODEX]: 0,
      [AGENT_NAMES.GEMINI]: 0
    };

    // Keyword matching (0-40 points)
    for (const agent of Object.values(AGENT_NAMES)) {
      const matchCount = this.countKeywordMatches(analysis.keywords, KEYWORD_MAPPINGS[agent]);
      scores[agent] += Math.min(matchCount * 10, 40);
    }

    // Task type bonus (0-30 points)
    scores[AGENT_NAMES.CLAUDE] += this.getTaskTypeBonus(analysis.taskType, [
      'architecture', 'refactoring', 'security'
    ]);
    scores[AGENT_NAMES.CODEX] += this.getTaskTypeBonus(analysis.taskType, [
      'code-generation', 'prototyping', 'testing'
    ]);
    scores[AGENT_NAMES.GEMINI] += this.getTaskTypeBonus(analysis.taskType, [
      'web-research', 'automation'
    ]);

    // Complexity consideration (0-15 points)
    if (analysis.complexity === 'high') {
      scores[AGENT_NAMES.CLAUDE] += 15;
      scores[AGENT_NAMES.CODEX] += 5;
      scores[AGENT_NAMES.GEMINI] += 8;
    } else if (analysis.complexity === 'medium') {
      scores[AGENT_NAMES.CLAUDE] += 10;
      scores[AGENT_NAMES.CODEX] += 12;
      scores[AGENT_NAMES.GEMINI] += 10;
    } else {
      scores[AGENT_NAMES.CODEX] += 15;
      scores[AGENT_NAMES.GEMINI] += 12;
      scores[AGENT_NAMES.CLAUDE] += 8;
    }

    // Special requirements (0-15 points)
    if (analysis.requiresWeb) {
      scores[AGENT_NAMES.GEMINI] += 15;
    }
    if (analysis.requiresSpeed) {
      scores[AGENT_NAMES.CODEX] += 15;
    }
    if (analysis.requiresContext) {
      scores[AGENT_NAMES.CLAUDE] += 15;
    }
    if (analysis.requiresCostEfficiency) {
      scores[AGENT_NAMES.GEMINI] += 15;
    }

    // Penalty for self-delegation (discourage unless strong match)
    if (currentAgent) {
      scores[currentAgent] *= 0.8;
    }

    // Normalize to 0-1 range
    const maxPossible = 100;
    const normalized: Record<AgentName, number> = {
      [AGENT_NAMES.CLAUDE]: Math.min(scores[AGENT_NAMES.CLAUDE] / maxPossible, 1),
      [AGENT_NAMES.CODEX]: Math.min(scores[AGENT_NAMES.CODEX] / maxPossible, 1),
      [AGENT_NAMES.GEMINI]: Math.min(scores[AGENT_NAMES.GEMINI] / maxPossible, 1)
    };

    return normalized;
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Extract relevant keywords
   */
  private extractKeywords(words: string[]): string[] {
    const allKeywords = new Set<string>();

    for (const mappings of Object.values(KEYWORD_MAPPINGS)) {
      for (const keyword of mappings) {
        if (words.some(word => keyword.includes(word) || word.includes(keyword))) {
          allKeywords.add(keyword);
        }
      }
    }

    return Array.from(allKeywords);
  }

  /**
   * Classify task type
   */
  private classifyTask(words: string[]): TaskType {
    const taskTypeScores: Record<TaskType, number> = {
      'architecture': this.countMatches(words, ['architecture', 'design', 'structure', 'pattern']),
      'refactoring': this.countMatches(words, ['refactor', 'restructure', 'reorganize', 'improve']),
      'security': this.countMatches(words, ['security', 'audit', 'vulnerability', 'secure']),
      'code-generation': this.countMatches(words, ['generate', 'create', 'write', 'implement']),
      'prototyping': this.countMatches(words, ['prototype', 'poc', 'demo', 'quick']),
      'web-research': this.countMatches(words, ['search', 'research', 'find', 'web']),
      'automation': this.countMatches(words, ['automate', 'workflow', 'script', 'process']),
      'debugging': this.countMatches(words, ['debug', 'fix', 'bug', 'error']),
      'testing': this.countMatches(words, ['test', 'testing', 'spec', 'unit']),
      'general': 0
    };

    const maxScore = Math.max(...Object.values(taskTypeScores));
    if (maxScore === 0) return 'general';

    const taskType = Object.entries(taskTypeScores)
      .find(([, score]) => score === maxScore)?.[0] as TaskType;

    return taskType || 'general';
  }

  /**
   * Assess task complexity
   */
  private assessComplexity(words: string[]): Complexity {
    const highScore = this.countMatches(words, COMPLEXITY_INDICATORS.high);
    const mediumScore = this.countMatches(words, COMPLEXITY_INDICATORS.medium);
    const lowScore = this.countMatches(words, COMPLEXITY_INDICATORS.low);

    if (highScore > 0) return 'high';
    if (lowScore > 0 && mediumScore === 0) return 'low';
    return 'medium';
  }

  /**
   * Check if task requires specific capability
   */
  private checkRequirement(words: string[], indicators: string[]): boolean {
    return this.countMatches(words, indicators) > 0;
  }

  /**
   * Count keyword matches
   */
  private countKeywordMatches(taskKeywords: string[], agentKeywords: string[]): number {
    return taskKeywords.filter(tk =>
      agentKeywords.some(ak => ak.includes(tk) || tk.includes(ak))
    ).length;
  }

  /**
   * Count word matches
   */
  private countMatches(words: string[], patterns: string[]): number {
    return words.filter(word =>
      patterns.some(pattern => pattern.includes(word) || word.includes(pattern))
    ).length;
  }

  /**
   * Get bonus points for task type match
   */
  private getTaskTypeBonus(taskType: TaskType, matchingTypes: TaskType[]): number {
    return matchingTypes.includes(taskType) ? 30 : 0;
  }

  /**
   * Generate human-readable reason for selection
   */
  private generateReason(agent: AgentName, analysis: TaskAnalysis): string {
    const reasons: string[] = [];

    // Task type reasoning
    if (agent === AGENT_NAMES.CLAUDE) {
      if (analysis.taskType === 'architecture') {
        reasons.push('excels at architectural design (95/100 capability score)');
      } else if (analysis.taskType === 'refactoring') {
        reasons.push('best for refactoring (90/100, 72.7% SWE-bench)');
      } else if (analysis.taskType === 'security') {
        reasons.push('strongest in security analysis (92/100, 44% faster)');
      } else if (analysis.complexity === 'high') {
        reasons.push('handles complex tasks with extended reasoning');
      } else if (analysis.requiresContext) {
        reasons.push('has 1M token context window for deep analysis');
      }
    } else if (agent === AGENT_NAMES.CODEX) {
      if (analysis.taskType === 'code-generation') {
        reasons.push('fastest code generation (95/100, 90.2% HumanEval)');
      } else if (analysis.taskType === 'prototyping') {
        reasons.push('ideal for rapid prototyping');
      } else if (analysis.requiresSpeed) {
        reasons.push('fastest completion time');
      } else if (analysis.complexity === 'low') {
        reasons.push('efficient for straightforward tasks');
      }
    } else if (agent === AGENT_NAMES.GEMINI) {
      if (analysis.taskType === 'web-research') {
        reasons.push('native web search capabilities (95/100)');
      } else if (analysis.taskType === 'automation') {
        reasons.push('computer use model for automation (95/100)');
      } else if (analysis.requiresWeb) {
        reasons.push('best for web-based tasks');
      } else if (analysis.requiresCostEfficiency) {
        reasons.push('most cost-effective option');
      }
    }

    if (reasons.length === 0) {
      reasons.push('balanced capabilities for this task');
    }

    return reasons.join(', ');
  }
}
