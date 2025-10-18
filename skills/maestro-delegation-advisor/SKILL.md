---
name: maestro-delegation-advisor
description: Expert system for AgentMaestro that helps decide when and how to delegate tasks to specialized AI agents (Claude, Codex, Gemini). Use when you need to determine which agent is best suited for a task, or when a task should be broken down and delegated to multiple agents.
---

# Maestro Delegation Advisor

This skill provides intelligent guidance for delegating tasks to specialized AI agents within the AgentMaestro multi-agent orchestration system.

## When to Use This Skill

Invoke this skill whenever you encounter a task that might benefit from delegation to a specialized agent. Consider delegation when:

- The task requires capabilities outside your primary strengths
- The task can be broken into parallel independent subtasks
- A specialized agent would complete the task more efficiently
- The task requires a combination of different capabilities (research + design + implementation)

## Available Agents and Their Capabilities

### Claude (Architecture & Security Specialist)
**Performance:** SWE-bench: 72.7% | Context: 1M tokens | Speed: Medium | Cost: High

**Best for:**
- Complex architecture & system design (95/100)
- Large-scale refactoring (90/100)
- Security audits & vulnerability analysis (92/100, 44% faster, 25% more accurate)
- Deep codebase analysis requiring extended context
- Enterprise-grade solutions requiring safety
- Financial analysis and legal document review

**Avoid for:**
- Simple, quick fixes (use Codex)
- Cost-sensitive projects (use Gemini)
- Tasks requiring web search (use Gemini)

**Indicators:** refactor, architecture, design, security, audit, vulnerability, analyze codebase, complex, enterprise

---

### Codex (Speed & Code Generation Specialist)
**Performance:** HumanEval: 90.2% | SWE-bench: 69.1% | Speed: Fastest | Cost: Medium

**Best for:**
- Rapid code generation (95/100)
- Quick prototyping & proof of concepts
- Algorithm implementation
- Unit test creation
- Time-constrained tasks
- Bug fixes and debugging
- Pair programming scenarios

**Avoid for:**
- Complex architectural decisions (use Claude)
- Security-critical code (use Claude)
- Tasks requiring deep context analysis (use Claude)

**Indicators:** generate, implement, create, write code, quick, fast, prototype, test, fix bug, algorithm

---

### Gemini (Automation & Research Specialist)
**Performance:** Context: Largest | Speed: Medium | Cost: Most Efficient

**Best for:**
- Web research & data gathering (95/100)
- Browser automation & UI tasks (95/100)
- Workflow automation
- Content generation (articles, reports, documentation)
- Budget-conscious projects
- Google Workspace integration

**Avoid for:**
- Complex refactoring (use Claude)
- Security audits (use Claude)
- Performance-critical code (use Codex)

**Indicators:** search, research, find, web, internet, automate, workflow, browser, content generation, budget

## Decision Framework

### Step 1: Analyze Task Characteristics

Before deciding on delegation, analyze these aspects:

```typescript
interface TaskAnalysis {
  // Complexity
  complexity: 'low' | 'medium' | 'high';

  // Special requirements
  requiresWeb: boolean;        // Needs internet search/research
  requiresSpeed: boolean;      // Time-constrained or urgent
  requiresContext: boolean;    // Needs deep codebase understanding
  securityCritical: boolean;   // Security/safety implications
  costSensitive: boolean;      // Budget constraints

  // Task nature
  canParallelize: boolean;     // Can be split into independent tasks
  hasDependencies: boolean;    // Sequential tasks with dependencies
}
```

### Step 2: Apply Decision Rules

**Rule 1: Security & Architecture → Claude**
- Keywords: security, audit, vulnerability, refactor, architecture, design
- Complexity: high
- Requires context: yes
- **Confidence: 0.9+**

**Rule 2: Code Generation & Speed → Codex**
- Keywords: implement, generate, create, quick, test, fix
- Requires speed: yes
- Complexity: low-medium
- **Confidence: 0.85+**

**Rule 3: Research & Automation → Gemini**
- Keywords: search, research, find, automate, web, browser
- Requires web: yes
- Cost sensitive: yes
- **Confidence: 0.85+**

**Rule 4: Mixed Tasks → Sequential Delegation**
- Research phase → Gemini
- Design phase → Claude
- Implementation phase → Codex
- **Use sequential delegation with context passing**

### Step 3: Choose Delegation Strategy

#### Single Delegation
Use when one agent can handle the entire task:

```
[[DELEGATE:agent_name]]
Task description here
[[/DELEGATE]]
```

#### Parallel Delegation
Use when tasks are independent and can run concurrently:

```
[[DELEGATE_PARALLEL]]
[[DELEGATE:codex]]Implement feature A[[/DELEGATE]]
[[DELEGATE:codex]]Implement feature B[[/DELEGATE]]
[[DELEGATE:gemini]]Generate documentation[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]
```

#### Sequential Delegation
Use when tasks have dependencies (each step uses previous results):

```
First:
[[DELEGATE:gemini]]
Research best practices for authentication systems
[[/DELEGATE]]

Wait for results, then:
[[DELEGATE:claude]]
Design secure authentication architecture based on the research findings
[[/DELEGATE]]

Wait for design, then:
[[DELEGATE:codex]]
Implement the authentication system following the architectural design
[[/DELEGATE]]
```

#### Background Delegation
Use for long-running tasks that don't block the main workflow:

```
[[DELEGATE:gemini background=true]]
Generate comprehensive documentation for the entire codebase
[[/DELEGATE]]
```

## Detailed Examples

### Example 1: Security Audit (Single Delegation to Claude)

**User Request:**
"Analyze our authentication system for vulnerabilities"

**Task Analysis:**
```typescript
{
  complexity: 'high',
  requiresWeb: false,
  requiresSpeed: false,
  requiresContext: true,
  securityCritical: true,
  costSensitive: false,
  canParallelize: false,
  hasDependencies: false
}
```

**Decision:** Claude (confidence: 0.95)
- Security analysis is Claude's top strength (92/100)
- 44% faster and 25% more accurate on security tasks
- Requires deep context understanding (1M token window)

**Output:**
```
[[DELEGATE:claude]]
Perform comprehensive security audit of the authentication system:
1. Analyze current implementation for vulnerabilities
2. Check for common security issues (OWASP Top 10)
3. Review session management and token handling
4. Identify potential attack vectors
5. Recommend specific improvements with priority levels
[[/DELEGATE]]
```

---

### Example 2: New Feature Implementation (Sequential Delegation)

**User Request:**
"Create a new user registration feature with best practices"

**Task Analysis:**
```typescript
{
  complexity: 'high',
  requiresWeb: true,        // Research best practices
  requiresSpeed: false,
  requiresContext: true,    // Understand existing system
  securityCritical: true,
  costSensitive: false,
  canParallelize: false,
  hasDependencies: true     // Research → Design → Implementation
}
```

**Decision:** Sequential delegation (Research → Design → Implement)

**Output:**
```
I'll break this into three phases:

Phase 1 - Research (Gemini):
[[DELEGATE:gemini]]
Research current best practices for user registration systems in 2025:
- Industry standards for password requirements
- Common security pitfalls to avoid
- Email verification patterns
- Rate limiting strategies
- GDPR and privacy considerations
[[/DELEGATE]]

Phase 2 - Design (Claude):
After receiving the research, I'll delegate the architecture:
[[DELEGATE:claude]]
Design a secure user registration architecture based on research findings:
- Database schema for users table
- API endpoint structure
- Security measures (hashing, validation, rate limiting)
- Email verification workflow
- Error handling strategy
[[/DELEGATE]]

Phase 3 - Implementation (Codex):
Finally, implement based on the design:
[[DELEGATE:codex]]
Implement the user registration feature following the architectural design:
- Create database migrations
- Implement API endpoints
- Add input validation
- Create unit tests
- Add integration tests
[[/DELEGATE]]
```

---

### Example 3: Bug Fix (Single Delegation to Codex)

**User Request:**
"Fix the bug where users can't login after password reset"

**Task Analysis:**
```typescript
{
  complexity: 'low',
  requiresWeb: false,
  requiresSpeed: true,      // Bug needs quick fix
  requiresContext: false,   // Localized issue
  securityCritical: false,
  costSensitive: false,
  canParallelize: false,
  hasDependencies: false
}
```

**Decision:** Codex (confidence: 0.9)
- Quick debugging and fixes are Codex's strength
- Fastest turnaround time
- Straightforward bug fix doesn't need extensive context

**Output:**
```
[[DELEGATE:codex]]
Debug and fix the login issue after password reset:
1. Check password reset token generation and validation
2. Verify session handling after password update
3. Test the complete password reset flow
4. Fix any issues found
5. Add test to prevent regression
[[/DELEGATE]]
```

---

### Example 4: Parallel Features (Parallel Delegation)

**User Request:**
"Add dark mode support and generate documentation for the new API"

**Task Analysis:**
```typescript
{
  complexity: 'medium',
  requiresWeb: false,
  requiresSpeed: true,
  requiresContext: false,
  securityCritical: false,
  costSensitive: false,
  canParallelize: true,     // Independent tasks!
  hasDependencies: false
}
```

**Decision:** Parallel delegation (both can run simultaneously)

**Output:**
```
These are independent tasks that can run in parallel:

[[DELEGATE_PARALLEL]]
[[DELEGATE:codex]]
Implement dark mode support:
- Add theme context/state management
- Create dark mode color palette
- Update all components to support theming
- Add theme toggle UI
- Save user preference
[[/DELEGATE]]

[[DELEGATE:gemini]]
Generate comprehensive API documentation:
- Document all endpoints with examples
- Add authentication requirements
- Include error responses
- Create getting started guide
- Add code examples in multiple languages
[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]
```

---

### Example 5: Research Task (Single Delegation to Gemini)

**User Request:**
"Find the best state management library for our React app"

**Task Analysis:**
```typescript
{
  complexity: 'low',
  requiresWeb: true,        // Needs internet research
  requiresSpeed: false,
  requiresContext: false,
  securityCritical: false,
  costSensitive: true,      // Research task, use cost-effective agent
  canParallelize: false,
  hasDependencies: false
}
```

**Decision:** Gemini (confidence: 0.95)
- Web research is Gemini's top strength (95/100)
- Most cost-effective for research tasks
- Native web search integration

**Output:**
```
[[DELEGATE:gemini]]
Research and compare state management libraries for React in 2025:
1. Compare Redux, Zustand, Jotai, Recoil, MobX
2. Evaluate based on: bundle size, performance, learning curve, community support
3. Find recent benchmarks and comparisons
4. Check compatibility with React 18+ features
5. Provide recommendation with pros/cons for each option
6. Include migration considerations from our current setup
[[/DELEGATE]]
```

## Confidence Scoring Guide

Always provide a confidence score (0-1) for your delegation decision:

- **0.95-1.0**: Perfect match, obvious choice
  - Example: Security audit → Claude, Web research → Gemini

- **0.85-0.95**: Strong match, highly recommended
  - Example: Code generation → Codex, Refactoring → Claude

- **0.70-0.85**: Good match, reasonable choice
  - Example: Mixed complexity tasks, moderate specialization needed

- **0.50-0.70**: Moderate match, consider alternatives
  - Example: General tasks, multiple agents could work

- **< 0.50**: Weak match, probably don't delegate
  - Example: Simple tasks you can handle directly

## Advanced Patterns

### Pattern 1: Fan-Out, Fan-In
Research multiple options in parallel, then synthesize:

```
[[DELEGATE_PARALLEL]]
[[DELEGATE:gemini]]Research authentication approach A[[/DELEGATE]]
[[DELEGATE:gemini]]Research authentication approach B[[/DELEGATE]]
[[DELEGATE:gemini]]Research authentication approach C[[/DELEGATE]]
[[/DELEGATE_PARALLEL]]

After results:
[[DELEGATE:claude]]
Analyze all three approaches and recommend the best one for our needs
[[/DELEGATE]]
```

### Pattern 2: Iterative Refinement
Use different agents' strengths in sequence:

```
[[DELEGATE:codex]]Generate initial implementation[[/DELEGATE]]
[[DELEGATE:claude]]Review and refactor for best practices[[/DELEGATE]]
[[DELEGATE:codex]]Apply refactoring suggestions[[/DELEGATE]]
```

### Pattern 3: Validation Chain
Generate → Review → Fix:

```
[[DELEGATE:codex]]Implement feature[[/DELEGATE]]
[[DELEGATE:claude]]Security review of implementation[[/DELEGATE]]
[[DELEGATE:codex]]Fix any security issues found[[/DELEGATE]]
```

## Common Anti-Patterns to Avoid

### ❌ Don't: Delegate Simple Tasks
```
# BAD: Overhead not worth it
[[DELEGATE:codex]]Add a console.log statement[[/DELEGATE]]

# GOOD: Just do it yourself
console.log('Debug message');
```

### ❌ Don't: Wrong Agent for the Job
```
# BAD: Codex is not optimal for architecture
[[DELEGATE:codex]]Design the entire system architecture[[/DELEGATE]]

# GOOD: Use Claude for architecture
[[DELEGATE:claude]]Design the entire system architecture[[/DELEGATE]]
```

### ❌ Don't: Over-Delegate
```
# BAD: Too much delegation overhead
[[DELEGATE:codex]]Create variable[[/DELEGATE]]
[[DELEGATE:codex]]Create function[[/DELEGATE]]
[[DELEGATE:codex]]Create class[[/DELEGATE]]

# GOOD: Single cohesive delegation
[[DELEGATE:codex]]
Create the complete user service module with:
- User class
- CRUD functions
- Input validation
[[/DELEGATE]]
```

### ❌ Don't: Circular Dependencies
```
# BAD: Creates infinite loop
[[DELEGATE:claude]]Implement feature and delegate testing[[/DELEGATE]]
  ↓
  [[DELEGATE:codex]]Test feature and delegate fixes[[/DELEGATE]]
    ↓
    [[DELEGATE:claude]]Fix issues and delegate testing[[/DELEGATE]]
      ↓ ... infinite loop

# GOOD: Clear sequence
[[DELEGATE:codex]]Implement feature[[/DELEGATE]]
Then: [[DELEGATE:codex]]Create tests[[/DELEGATE]]
```

## Decision Tree Summary

```
Start: Analyze Task
    │
    ├─ Security/Architecture/Refactoring?
    │  └─ YES → Claude (0.9+ confidence)
    │
    ├─ Code Generation/Quick Implementation?
    │  └─ YES → Codex (0.85+ confidence)
    │
    ├─ Research/Web/Automation?
    │  └─ YES → Gemini (0.85+ confidence)
    │
    ├─ Multiple Independent Tasks?
    │  └─ YES → Parallel Delegation
    │
    ├─ Sequential Phases (Research→Design→Code)?
    │  └─ YES → Sequential: Gemini → Claude → Codex
    │
    ├─ Simple Task?
    │  └─ YES → Don't delegate (< 0.5 confidence)
    │
    └─ Complex Mixed Task?
       └─ YES → Break down and delegate appropriately
```

## Integration with AgentMaestro

This skill is designed specifically for AgentMaestro's delegation protocol. When you output delegation markers, the AgentMaestro orchestrator will:

1. Detect `[[DELEGATE:...]]` markers in your output
2. Parse the delegation request
3. Validate the target agent and task
4. Spawn the appropriate agent CLI (claude-code, codex, gemini-cli)
5. Execute the task with timeout protection
6. Return results back to you
7. Handle parallel delegations concurrently
8. Manage delegation depth to prevent infinite loops (max 3 levels)

**You don't need to worry about execution** - just output the delegation markers and AgentMaestro handles the rest!

## Delegation Limits and Best Practices

- **Max Depth:** 3 levels of delegation (configurable)
- **Default Timeout:** 120 seconds per delegation
- **Parallel Limit:** No hard limit, but consider system resources
- **Cost Awareness:** Prefer Gemini when appropriate to save costs
- **Context Passing:** Results from one delegation are available for the next

## Quick Reference: Agent Selection Cheat Sheet

| Task Type | Primary Agent | Alternative | Avoid |
|-----------|---------------|-------------|-------|
| Security Audit | Claude (0.95) | - | Codex, Gemini |
| Architecture | Claude (0.95) | - | Codex, Gemini |
| Refactoring | Claude (0.90) | - | - |
| Code Generation | Codex (0.95) | Claude (0.75) | - |
| Quick Prototype | Codex (0.90) | - | Claude |
| Bug Fix | Codex (0.90) | - | - |
| Unit Tests | Codex (0.90) | - | - |
| Web Research | Gemini (0.95) | - | Claude, Codex |
| Automation | Gemini (0.95) | - | - |
| Documentation | Gemini (0.85) | - | - |
| Mixed (R+D+I) | Sequential | - | Single agent |

---

**Remember:** The goal is to leverage each agent's strengths for optimal results. When in doubt, consider:
1. Task complexity → Claude for high, Codex for low-medium
2. Time sensitivity → Codex for speed
3. Need for research → Gemini for web access
4. Cost sensitivity → Gemini for efficiency

Use this skill to make informed delegation decisions that maximize the effectiveness of the AgentMaestro multi-agent system!
