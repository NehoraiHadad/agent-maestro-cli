# Delegation Demo Examples

## Example 1: Simple Delegation

### Scenario
Claude Code delegates a web search task to Gemini.

### Primary Agent
Claude Code

### User Prompt
```
"Search for the latest Next.js 14 features using Gemini, then summarize them for me."
```

### Expected Delegation
```javascript
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Search for Next.js 14 latest features and provide a detailed list"}
```

### Expected Flow
1. User sends request to Claude
2. Claude recognizes it needs web search capability
3. Claude emits delegation request
4. Maestro intercepts and spawns Gemini
5. Gemini searches and returns results
6. Claude summarizes results for user

---

## Example 2: Code Generation Chain

### Scenario
Gemini researches, Codex generates, Claude reviews.

### Primary Agent
Gemini CLI

### User Prompt
```
"Research React 19 hooks best practices, ask Codex to generate example code, then have Claude review it."
```

### Expected Delegations
```javascript
// Gemini researches (no delegation needed - it's primary)

// After research, delegate to Codex
MAESTRO_DELEGATE::{"agent": "codex", "prompt": "Generate React 19 hooks example code with best practices: [research results]"}

// After code generation, delegate to Claude
MAESTRO_DELEGATE::{"agent": "claude", "prompt": "Review this React hooks code for best practices and potential issues: [code]"}
```

---

## Example 3: Parallel Research

### Scenario
Multiple research tasks in parallel.

### Primary Agent
Claude Code

### User Prompt
```
"I need to compare Flask, FastAPI, and Django. Use multiple agents to research each framework simultaneously."
```

### Expected Delegations (Parallel)
```javascript
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Research Flask framework pros, cons, and use cases"}
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Research FastAPI framework pros, cons, and use cases"}
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Research Django framework pros, cons, and use cases"}
```

---

## Example 4: Bug Fix Workflow

### Scenario
Debug → Research → Fix → Test

### Primary Agent
Claude Code

### User Prompt
```
"I'm getting a 'CORS policy' error. Research the issue, implement a fix, and create tests."
```

### Expected Delegations
```javascript
// Research the error
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Search for CORS policy error solutions in Express.js"}

// Generate fix after research
MAESTRO_DELEGATE::{"agent": "codex", "prompt": "Implement CORS fix for Express.js based on: [research results]"}

// Generate tests
MAESTRO_DELEGATE::{"agent": "codex", "prompt": "Create unit tests for CORS middleware"}
```

---

## Example 5: Documentation Generation

### Scenario
Code analysis → Documentation generation

### Primary Agent
Codex

### User Prompt
```
"Analyze the authentication module and generate comprehensive documentation."
```

### Expected Delegations
```javascript
// Analyze code structure
MAESTRO_DELEGATE::{"agent": "claude", "prompt": "Analyze the authentication module structure and identify key components"}

// Generate docs based on analysis
// (Codex generates as primary, no delegation needed)
```

---

## Testing Delegation Protocol

### Manual Test

You can test delegation manually by instructing the primary agent:

```
"You are running in Maestro. To delegate, output exactly:
MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "your task here"}

Now, please search for Python best practices by delegating to Gemini."
```

### Verification

Check that:
1. Delegation request is intercepted (doesn't appear in output)
2. Secondary agent starts (spinner shows)
3. Result is formatted properly
4. Result is passed back to primary agent

---

## Common Delegation Patterns

### Pattern 1: Research → Implement
```
Primary: Plans and requests research
↓
Secondary: Performs research
↓
Primary: Uses research to implement
```

### Pattern 2: Generate → Review
```
Primary: Generates initial code
↓
Secondary: Reviews and suggests improvements
↓
Primary: Refines based on feedback
```

### Pattern 3: Parallel Specialists
```
Primary: Coordinates tasks
↓ ↓ ↓
Multiple Secondary: Each handles specialized task
↓ ↓ ↓
Primary: Aggregates and synthesizes results
```

---

## Tips for Effective Delegation

1. **Be Specific**: Clear prompts get better results
   - Good: "Search for Flask SQLAlchemy best practices for large databases"
   - Bad: "Find Flask stuff"

2. **Match Agent Strengths**:
   - Gemini: Web search, automation
   - Codex: Code generation, completion
   - Claude: Architecture, refactoring, review

3. **Keep Context**: Include relevant context in delegation prompts

4. **Avoid Loops**: Don't create circular delegation patterns

5. **Use Timeouts**: Set appropriate timeouts for long-running tasks
