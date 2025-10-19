# Testing AgentMaestro Subagents

This document provides test scenarios to verify that the Claude Code subagents work correctly.

## Prerequisites

✅ Codex CLI installed: `codex --version` → 0.46.0
✅ Gemini CLI installed: `gemini --version` → 0.9.0
✅ Subagents created in `.claude/agents/`:
  - `codex-delegator.md`
  - `gemini-delegator.md`

---

## Test 1: Codex Delegator (Code Generation)

### Scenario
Ask Claude Code to implement a simple function.

### User Request
```
Implement a Python function that calculates the factorial of a number.
Include type hints, docstring, and handle edge cases.
```

### Expected Behavior
1. Claude Code recognizes this as a **code generation** task
2. Matches `codex-delegator` description: "implementing features, writing tests, generating code"
3. Automatically invokes `codex-delegator` subagent via Task tool
4. Subagent executes: `codex "Implement a Python function..."`
5. Result returned **without** intermediate output consuming tokens
6. Claude presents the implementation

### What to Look For
- ✅ Claude mentions delegating to Codex or using a specialized agent
- ✅ Implementation appears quickly (Codex is fast)
- ✅ Clean output without raw CLI noise
- ✅ Token count stays reasonable (not 5000+ tokens from Codex's thinking)

---

## Test 2: Gemini Delegator (Research)

### Scenario
Ask Claude Code to research current best practices.

### User Request
```
Research the best practices for implementing rate limiting in REST APIs in 2025.
Include common algorithms, recommended libraries, and security considerations.
```

### Expected Behavior
1. Claude Code recognizes this as a **research** task
2. Matches `gemini-delegator` description: "web research, data gathering"
3. Automatically invokes `gemini-delegator` subagent via Task tool
4. Subagent executes: `gemini -p "Research best practices..."`
5. Result returned **without** intermediate output consuming tokens
6. Claude presents the research findings

### What to Look For
- ✅ Claude mentions researching or gathering information
- ✅ Current, up-to-date information (2025 data)
- ✅ Multiple sources or perspectives included
- ✅ Token count reasonable (research doesn't consume all context)

---

## Test 3: No Delegation (Claude Handles Directly)

### Scenario
Ask Claude Code to perform architecture or security analysis.

### User Request
```
Review the authentication system architecture in this codebase.
Identify security vulnerabilities and recommend improvements.
```

### Expected Behavior
1. Claude Code recognizes this as **architecture/security** task
2. Does NOT delegate (this is Claude's specialty!)
3. Handles the analysis directly
4. Uses Read, Grep, Glob tools to analyze code
5. Provides comprehensive security recommendations

### What to Look For
- ❌ NO delegation to Codex or Gemini
- ✅ Claude analyzes files directly
- ✅ Deep, thorough security analysis
- ✅ Architectural recommendations

---

## Test 4: Sequential Delegation (Complex Task)

### Scenario
Ask Claude Code for a complex feature requiring multiple phases.

### User Request
```
Create a user registration feature with industry best practices.
Research current standards, design the architecture, and implement it.
```

### Expected Behavior
1. **Phase 1:** Claude delegates to `gemini-delegator` for research
   - Gemini researches best practices
2. **Phase 2:** Claude handles architecture design himself
   - Security considerations
   - Database design
   - API structure
3. **Phase 3:** Claude delegates to `codex-delegator` for implementation
   - Codex generates the code

### What to Look For
- ✅ Clear phase separation
- ✅ Two delegations: Gemini → Claude → Codex
- ✅ Each agent does what it's best at
- ✅ Cohesive final solution

---

## Manual Testing (Fallback)

If automatic invocation doesn't work, you can test the subagents manually:

### Test Codex Directly
```bash
codex "Write a hello world function in Python with type hints"
```

**Expected:** Function implementation with proper types and docstring

### Test Gemini Directly
```bash
gemini -p "What are the top 3 React state management libraries in 2025?"
```

**Expected:** Research results with current information

---

## Troubleshooting

### Subagent Not Invoked

**Symptom:** Claude doesn't delegate, handles task himself
**Causes:**
1. Task description doesn't clearly match subagent's description
2. Claude decides he can handle it better
3. Subagent file has syntax errors in YAML frontmatter

**Solutions:**
- Make request more explicit: "Use Codex to implement..."
- Check `.claude/agents/*.md` for valid YAML
- Verify `description` field matches task type

### Wrong Command Syntax

**Symptom:** Subagent runs but CLI fails
**Causes:**
1. Wrong CLI name (e.g., `gemini-cli` instead of `gemini`)
2. Missing flags (e.g., `-p` for non-interactive mode)

**Solutions:**
- Verify CLI names: `which codex` and `which gemini`
- Check CLI help: `codex --help` and `gemini --help`
- Update subagent files with correct syntax

### Token Consumption

**Symptom:** Lots of tokens consumed during delegation
**Causes:**
1. Subagent using wrong tool (not Bash)
2. Output being returned to main context

**Solutions:**
- Verify `tools: Bash` in subagent YAML
- Check that subagent is actually running in separate context
- Monitor token usage before/after delegation

---

## Success Criteria

✅ **Codex Delegator Works:**
- Code generation tasks automatically delegated
- Fast implementation (10-30 seconds)
- Clean output without debug noise
- Tokens not consumed by Codex's internal processing

✅ **Gemini Delegator Works:**
- Research tasks automatically delegated
- Current, relevant information (2025)
- Clean research summary
- Tokens not consumed by Gemini's search process

✅ **Claude Handles Architecture:**
- Security/architecture tasks NOT delegated
- Claude uses his strengths directly
- Deep, thoughtful analysis

✅ **Sequential Works:**
- Complex tasks broken into phases
- Each agent handles appropriate phase
- Cohesive final result

---

## Next Steps

After successful testing:

1. **Refine descriptions** - Based on which tasks do/don't trigger delegation
2. **Add more subagents** - For other specialized tools or workflows
3. **Document patterns** - Which task types work best with each agent
4. **Optimize prompts** - Improve subagent system prompts based on results

---

**Testing Date:** 2025-10-19
**Status:** Ready for testing
**Files to Check:**
- `.claude/agents/codex-delegator.md` ✅
- `.claude/agents/gemini-delegator.md` ✅ (fixed to use `gemini` not `gemini-cli`)
- `skills/maestro-delegation-advisor/SKILL.md` ✅
