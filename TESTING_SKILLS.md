# Testing AgentMaestro Skills Integration

This document provides test scenarios to verify that the `maestro-delegation-advisor` skill is working correctly with Claude Code.

## Prerequisites

✅ AgentMaestro Skills must be installed:
```bash
maestro skills status
# Should show: ✅ Installed
```

If not installed:
```bash
maestro skills install
```

## Test Scenarios

### Test 1: Simple Security Task (Expected: Delegate to Claude)

**Objective:** Verify Claude recognizes security tasks and delegates appropriately.

**Steps:**
```bash
# Start maestro with Claude
maestro --agent claude

# Enter this prompt:
> Analyze our authentication system for security vulnerabilities
```

**Expected Behavior (WITH Skill):**
- Claude mentions security being Claude's strength
- References capability scores (e.g., "92/100")
- Outputs: `[[DELEGATE:claude]]` with detailed security audit steps
- May reference "44% faster" or other benchmarks

**Expected Behavior (WITHOUT Skill):**
- Generic response
- May delegate to wrong agent or not delegate at all
- No mention of capability scores or reasoning

---

### Test 2: Quick Code Generation (Expected: Delegate to Codex)

**Objective:** Verify Claude recognizes speed requirements.

**Steps:**
```bash
maestro --agent claude

# Enter this prompt:
> Quickly implement a function to validate email addresses with regex
```

**Expected Behavior (WITH Skill):**
- Claude identifies this as quick code generation task
- Mentions Codex's speed (e.g., "fastest", "95/100")
- Outputs: `[[DELEGATE:codex]]` with clear implementation request

**Expected Behavior (WITHOUT Skill):**
- May try to implement directly
- Or delegate without clear reasoning

---

### Test 3: Web Research Task (Expected: Delegate to Gemini)

**Objective:** Verify Claude recognizes research requirements.

**Steps:**
```bash
maestro --agent claude

# Enter this prompt:
> Research the best state management libraries for React in 2025
```

**Expected Behavior (WITH Skill):**
- Claude identifies need for web research
- Mentions Gemini's research capability (e.g., "95/100 for web research")
- May mention cost-effectiveness
- Outputs: `[[DELEGATE:gemini]]` with research objectives

**Expected Behavior (WITHOUT Skill):**
- May claim to have outdated knowledge
- Or attempt research without delegation

---

### Test 4: Complex Multi-Phase Task (Expected: Sequential Delegation)

**Objective:** Verify Claude breaks down complex tasks appropriately.

**Steps:**
```bash
maestro --agent claude

# Enter this prompt:
> Create a new user registration feature with industry best practices
```

**Expected Behavior (WITH Skill):**
- Claude recognizes this needs multiple phases
- Suggests sequential delegation:
  1. Research (Gemini) → best practices
  2. Design (Claude) → architecture
  3. Implementation (Codex) → code
- Outputs multiple `[[DELEGATE:...]]` blocks in sequence
- Explains the reasoning for each phase

**Expected Behavior (WITHOUT Skill):**
- May try to do everything at once
- Or delegate to single agent
- Less structured breakdown

---

### Test 5: Parallel Tasks (Expected: Parallel Delegation)

**Objective:** Verify Claude recognizes independent tasks.

**Steps:**
```bash
maestro --agent claude

# Enter this prompt:
> Add dark mode support AND generate API documentation
```

**Expected Behavior (WITH Skill):**
- Claude identifies tasks as independent
- Suggests parallel execution
- Outputs:
  ```
  [[DELEGATE_PARALLEL]]
  [[DELEGATE:codex]]Add dark mode...[[/DELEGATE]]
  [[DELEGATE:gemini]]Generate API docs...[[/DELEGATE]]
  [[/DELEGATE_PARALLEL]]
  ```

**Expected Behavior (WITHOUT Skill):**
- Sequential delegation or single agent
- Less optimization

---

## Indicators That Skill Is Active

When the skill is working, you should see Claude:

✅ **Reference capability scores:**
- "Claude excels at security (92/100)"
- "Codex is fastest for code generation (95/100)"
- "Gemini best for web research (95/100)"

✅ **Provide confidence levels:**
- "Confidence: 0.95"
- "Strong match for this agent"

✅ **Explain reasoning:**
- "This requires deep context analysis..."
- "Speed is critical here..."
- "This needs web search capabilities..."

✅ **Use proper delegation protocol:**
- Clear `[[DELEGATE:agent]]` blocks
- Detailed task descriptions
- Appropriate agent selection

✅ **Reference benchmarks:**
- "SWE-bench: 72.7%"
- "HumanEval: 90.2%"
- "44% faster on security tasks"

---

## Debugging

### If skill seems inactive:

**1. Verify installation:**
```bash
maestro skills status
# Should show: ✅ Installed
# Location: ~/.claude/skills/maestro-delegation-advisor
```

**2. Check skill content:**
```bash
cat ~/.claude/skills/maestro-delegation-advisor/SKILL.md | head -20
# Should show YAML frontmatter with name and description
```

**3. Restart Claude Code:**
Skills are loaded at Claude Code startup. If you installed the skill while Claude was already running, restart maestro:
```bash
# Exit current session (Ctrl+C or Ctrl+D)
# Start fresh
maestro --agent claude
```

**4. Check maestro is using Claude:**
```bash
# Verify Claude is the primary agent
maestro list
# Ensure Claude Code is installed and available
```

**5. Verbose logging:**
```bash
# Run with verbose flag
maestro --agent claude --verbose
# Look for delegation-related messages
```

### If delegations aren't executing:

This is a **different issue** - the skill teaches Claude WHEN to delegate, but AgentMaestro executes the delegation. Check:

```bash
# Verify DelegationOrchestrator is running
# Should see delegation markers being parsed
# Check AgentMaestro logs
```

---

## Quick Verification Script

Run this to test all scenarios quickly:

```bash
#!/bin/bash
echo "=== AgentMaestro Skills Test Suite ==="
echo ""

# Test 1: Security
echo "Test 1: Security audit (expect Claude delegation)"
echo "Analyze our authentication system for vulnerabilities" | maestro --agent claude

# Test 2: Quick code
echo ""
echo "Test 2: Quick implementation (expect Codex delegation)"
echo "Quickly implement email validation function" | maestro --agent claude

# Test 3: Research
echo ""
echo "Test 3: Web research (expect Gemini delegation)"
echo "Research best React state management libraries" | maestro --agent claude

echo ""
echo "=== Tests Complete ==="
```

Save as `test-skills.sh`, make executable with `chmod +x test-skills.sh`, and run `./test-skills.sh`.

---

## Expected Results Summary

| Task Type | Expected Agent | Key Indicators |
|-----------|---------------|----------------|
| Security audit | Claude | "92/100", "44% faster", security expertise |
| Quick code gen | Codex | "95/100", "fastest", "90.2% HumanEval" |
| Web research | Gemini | "95/100", web search, cost-effective |
| Complex feature | Sequential | Multiple phases, research→design→code |
| Independent tasks | Parallel | `[[DELEGATE_PARALLEL]]` |

---

## Reporting Issues

If the skill doesn't seem to work:

1. **Capture the output:**
   ```bash
   maestro --agent claude > test-output.log 2>&1
   ```

2. **Check the skill file:**
   ```bash
   ls -lh ~/.claude/skills/maestro-delegation-advisor/SKILL.md
   md5sum ~/.claude/skills/maestro-delegation-advisor/SKILL.md
   ```

3. **Verify Claude Code version:**
   ```bash
   claude-code --version
   # Skills require Claude Code to support the Skills feature
   ```

4. **Open an issue** with:
   - Test scenario used
   - Actual vs expected behavior
   - Skill status output
   - Claude Code version

---

## Success Criteria

The skill integration is successful when:

✅ Claude autonomously decides when to delegate
✅ Agent selection matches task requirements
✅ Claude provides reasoning and confidence scores
✅ Delegation protocol is used correctly
✅ Complex tasks are broken down intelligently
✅ Parallel opportunities are identified

**Happy testing! 🎉**
