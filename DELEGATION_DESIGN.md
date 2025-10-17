# Agent Delegation System - Design Document

## Executive Summary

This document outlines the design for an intelligent delegation system that allows AI agents to autonomously delegate tasks to other agents based on their specialized capabilities and strengths.

## Research Findings (October 2025)

### Claude (Anthropic) - Best For:
- **Primary Strength:** Complex architecture and long-running autonomous development
- **Performance:** 72.7% accuracy on SWE-bench Verified
- **Key Capabilities:**
  - Extended reasoning for architectural decisions
  - 30+ hours of autonomous coding
  - Security/cybersecurity analysis (44% faster, 25% more accurate)
  - Enterprise applications requiring safety
  - Complex refactoring and codebase navigation
  - 1M token context window (750K words)
  - MCP integration for tool use
- **Best Use Cases:**
  - Large-scale refactoring projects
  - Architectural design and planning
  - Security audits and vulnerability analysis
  - Complex debugging requiring deep context
  - Financial analysis and legal document review

### Codex (OpenAI) - Best For:
- **Primary Strength:** Speed and code generation
- **Performance:** 90.2% on HumanEval, 69.1% on SWE-bench
- **Key Capabilities:**
  - Fastest code generation
  - Quick prototyping
  - Algorithmic problem solving
  - Multiple autonomy modes (suggest, auto-edit, full-auto)
  - Tight integration with *nix shells and Git
  - Parallel task execution
- **Best Use Cases:**
  - Rapid prototyping
  - Code completion and suggestions
  - Unit test creation
  - Algorithmic implementations
  - Time-constrained tasks
  - Pair programming scenarios

### Gemini (Google) - Best For:
- **Primary Strength:** Automation, web search, and browser control
- **Performance:** Balanced performance, most cost-effective
- **Key Capabilities:**
  - Largest context window
  - Computer use model (UI automation)
  - Web search grounding
  - Browser control (form filling, navigation)
  - Google Workspace integration
  - Enterprise workflow automation (30% workload reduction)
- **Best Use Cases:**
  - Web research and data gathering
  - Browser automation tasks
  - Content generation
  - Workflow automation
  - Budget-constrained projects
  - Tasks requiring web search

## Current System Architecture

### Existing Components:

1. **Delegator** (`src/features/delegation/Delegator.ts`)
   - Executes delegations with depth tracking
   - Manages PTY processes
   - Handles parallel delegations
   - Timeout management

2. **RequestValidator** (`src/features/delegation/RequestValidator.ts`)
   - Validates agent names
   - Validates prompts and priorities
   - Checks required fields

3. **AgentRepository** (`src/domain/repositories/AgentRepository.ts`)
   - Maintains agent registry
   - Agent configuration management
   - Capability tracking

4. **Agent Entity** (`src/domain/entities/Agent.ts`)
   - Agent metadata (name, command, flags)
   - Capability management
   - Execution argument generation

## Proposed Enhancements

### 1. Intelligent Agent Selector

Create a new component that analyzes task requirements and selects the most appropriate agent.

**File:** `src/features/delegation/AgentSelector.ts`

**Responsibilities:**
- Analyze task description for keywords and patterns
- Match task requirements to agent capabilities
- Consider current workload and availability
- Return recommended agent with confidence score

**Selection Criteria:**
```typescript
interface TaskAnalysis {
  keywords: string[];
  taskType: TaskType;
  complexity: 'low' | 'medium' | 'high';
  requiresWeb: boolean;
  requiresSpeed: boolean;
  requiresContext: boolean;
}

type TaskType =
  | 'architecture'    // → Claude
  | 'refactoring'     // → Claude
  | 'security'        // → Claude
  | 'code-generation' // → Codex
  | 'prototyping'     // → Codex
  | 'web-research'    // → Gemini
  | 'automation'      // → Gemini
  | 'general';        // → Default agent
```

**Keyword Mapping:**
```typescript
const KEYWORD_MAPPINGS = {
  claude: [
    'refactor', 'architecture', 'design', 'security',
    'analyze codebase', 'restructure', 'audit',
    'complex', 'enterprise', 'large-scale'
  ],
  codex: [
    'generate code', 'implement', 'create function',
    'write tests', 'prototype', 'quick', 'fast',
    'algorithm', 'completion', 'suggest'
  ],
  gemini: [
    'search', 'research', 'find information', 'web',
    'automate', 'browser', 'scrape', 'google',
    'workflow', 'content', 'generate report'
  ]
};
```

### 2. Delegation Protocol Parser

Parse delegation requests from agent output using a standardized protocol.

**File:** `src/features/delegation/DelegationProtocolParser.ts`

**Protocol Format:**
```
[[DELEGATE:agent_name]]
Task description here
[[/DELEGATE]]
```

**Examples:**
```
User: "Analyze this codebase and create a new feature for user authentication"

Claude response:
"I'll analyze the codebase first.
[[DELEGATE:claude]]
Analyze the current authentication implementation and identify improvement opportunities
[[/DELEGATE]]

Then I'll implement the feature.
[[DELEGATE:codex]]
Implement OAuth2 authentication using the patterns identified in the codebase analysis
[[/DELEGATE]]
"
```

### 3. Delegation Decision Engine

Make intelligent decisions about when and how to delegate.

**File:** `src/features/delegation/DelegationDecisionEngine.ts`

**Decision Factors:**
- Task complexity analysis
- Current agent's capability match
- Estimated time vs. delegation overhead
- Maximum delegation depth
- Task dependencies

**Decision Logic:**
```typescript
interface DelegationDecision {
  shouldDelegate: boolean;
  targetAgent: AgentName | null;
  reason: string;
  confidence: number; // 0-1
}

class DelegationDecisionEngine {
  async analyze(
    task: string,
    currentAgent: AgentName,
    context: DelegationContext
  ): Promise<DelegationDecision>;
}
```

### 4. Enhanced Agent Capabilities

Update `AgentRepository` to include detailed capability scores based on research findings.

**File:** `src/domain/repositories/AgentRepository.ts` (enhancement)

**New Structure:**
```typescript
interface AgentCapabilityScore {
  capability: string;
  score: number; // 0-100
  benchmarks?: {
    name: string;
    result: string;
  }[];
}

interface EnhancedAgentConfig extends AgentType {
  strengths: string[];
  weaknesses: string[];
  capabilityScores: AgentCapabilityScore[];
  benchmarkData: {
    'SWE-bench'?: number;
    'HumanEval'?: number;
    speed?: 'fast' | 'medium' | 'slow';
    costEfficiency?: 'high' | 'medium' | 'low';
  };
}
```

**Example Configuration:**
```typescript
{
  name: 'claude',
  capabilityScores: [
    { capability: 'architecture', score: 95 },
    { capability: 'refactoring', score: 90 },
    { capability: 'security', score: 92 },
    { capability: 'code-generation', score: 75 },
    { capability: 'speed', score: 60 }
  ],
  benchmarkData: {
    'SWE-bench': 72.7,
    speed: 'medium',
    costEfficiency: 'low'
  }
}
```

### 5. Delegation Workflow Manager

Orchestrate multi-step delegations with dependencies.

**File:** `src/features/delegation/DelegationWorkflowManager.ts`

**Features:**
- Sequential delegations with context passing
- Parallel delegations for independent tasks
- Result aggregation
- Workflow state management

**Example Workflow:**
```typescript
const workflow = new DelegationWorkflow([
  {
    step: 1,
    agent: 'gemini',
    task: 'Research best practices for authentication',
    dependencies: []
  },
  {
    step: 2,
    agent: 'claude',
    task: 'Design authentication architecture based on research: {step1}',
    dependencies: [1]
  },
  {
    step: 3,
    agent: 'codex',
    task: 'Implement authentication following architecture: {step2}',
    dependencies: [2]
  }
]);

await workflow.execute();
```

## Implementation Plan

### Phase 1: Foundation (Current Sprint)
1. ✅ Research agent capabilities (completed)
2. ✅ Analyze existing delegation infrastructure (completed)
3. Create `AgentSelector.ts` with basic keyword matching
4. Create `DelegationProtocolParser.ts` with regex-based parsing
5. Update agent configurations with capability scores

### Phase 2: Intelligence Layer
1. Implement `DelegationDecisionEngine.ts`
2. Add machine learning for pattern recognition (optional)
3. Implement confidence scoring
4. Add delegation recommendations to agent output

### Phase 3: Workflow Management
1. Create `DelegationWorkflowManager.ts`
2. Implement dependency resolution
3. Add parallel execution support
4. Implement result aggregation

### Phase 4: Integration & Testing
1. Integrate with existing Maestro system
2. Add delegation tracking to UI
3. Create comprehensive tests
4. Performance optimization
5. Documentation updates

## Protocol Specification

### Delegation Request Format

**Simple Delegation:**
```
[[DELEGATE:agent_name]]
Task description
[[/DELEGATE]]
```

**Advanced Delegation:**
```
[[DELEGATE:agent_name priority=high timeout=30000]]
Task description
[[/DELEGATE]]
```

**Parallel Delegations:**
```
[[DELEGATE_PARALLEL]]
[[DELEGATE:codex]]Task 1[[/DELEGATE]]
[[DELEGATE:gemini]]Task 2[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]
```

### Response Format

```
[[DELEGATION_RESULT:agent_name status=success]]
Result content here
[[/DELEGATION_RESULT]]
```

## Agent Selection Decision Tree

```
Task Analysis
    │
    ├─ Contains "refactor", "architecture", "security"?
    │  └─ YES → Claude (confidence: 0.9)
    │
    ├─ Contains "generate", "implement", "quick"?
    │  └─ YES → Codex (confidence: 0.85)
    │
    ├─ Contains "search", "research", "web", "automate"?
    │  └─ YES → Gemini (confidence: 0.85)
    │
    ├─ Task complexity = HIGH + requires context?
    │  └─ YES → Claude (confidence: 0.8)
    │
    ├─ Task requires SPEED?
    │  └─ YES → Codex (confidence: 0.8)
    │
    ├─ Task requires COST-EFFICIENCY?
    │  └─ YES → Gemini (confidence: 0.75)
    │
    └─ ELSE → Default agent (confidence: 0.5)
```

## Configuration

### Agent Capability Matrix

| Capability | Claude | Codex | Gemini | Notes |
|------------|--------|-------|--------|-------|
| Architecture | 95 | 60 | 65 | Claude: Extended reasoning |
| Code Generation | 75 | 95 | 70 | Codex: HumanEval 90.2% |
| Refactoring | 90 | 65 | 70 | Claude: SWE-bench 72.7% |
| Security | 92 | 60 | 55 | Claude: 44% faster, 25% more accurate |
| Speed | 60 | 95 | 70 | Codex: Fastest completion |
| Web Research | 50 | 45 | 95 | Gemini: Native web search |
| Automation | 60 | 70 | 95 | Gemini: Computer use model |
| Cost Efficiency | 40 | 60 | 95 | Gemini: Best value |
| Context Window | 95 | 70 | 95 | Claude: 1M tokens, Gemini: Largest |
| Parallel Tasks | 60 | 85 | 75 | Codex: Built-in parallel support |

### Delegation Rules

1. **Max Depth:** 3 levels (configurable)
2. **Timeout:** 120 seconds default (per delegation)
3. **Retry Policy:** 1 retry on failure
4. **Circular Prevention:** Track delegation chain
5. **Cost Awareness:** Prefer lower-cost agents when appropriate

## Success Metrics

1. **Delegation Accuracy:** % of delegations to correct agent
2. **Task Success Rate:** % of delegated tasks completed successfully
3. **Time Efficiency:** Average time saved vs. manual agent selection
4. **Cost Efficiency:** Average cost per delegation
5. **User Satisfaction:** Feedback on delegation decisions

## Security Considerations

1. **Validation:** All delegation requests must be validated
2. **Sandbox:** Each delegated task runs in isolated environment
3. **Timeout:** Prevent infinite loops with strict timeouts
4. **Audit:** Log all delegations for review
5. **Permissions:** Respect agent auth requirements

## Future Enhancements

1. **Machine Learning:** Train model on delegation patterns
2. **Feedback Loop:** Learn from successful/failed delegations
3. **Cost Optimization:** Dynamic agent selection based on budget
4. **Load Balancing:** Distribute tasks across available agents
5. **Custom Agents:** Allow users to register custom agents
6. **Delegation Analytics:** Dashboard showing delegation patterns

## References

- Claude Code Best Practices: https://www.anthropic.com/engineering/claude-code-best-practices
- OpenAI Codex Documentation: https://openai.com/index/introducing-codex/
- Gemini CLI Features: https://4idiotz.com/tech/artificial-intelligence/gemini-cli-the-ultimate-open-source-ai-agent-for-2025
- SWE-bench Verified Results: https://render.com/blog/ai-coding-agents-benchmark
- Comparison Study: https://www.codeant.ai/blogs/claude-code-cli-vs-codex-cli-vs-gemini-cli

---

**Document Version:** 1.0
**Last Updated:** October 17, 2025
**Status:** Phase 1 - Research Complete
