# Delegation Demo Examples

## Example 1: Code Review with Multiple Agents

**Primary Agent: Gemini**

User prompt to Gemini:

```
You are the primary agent in Agent Maestro. You can delegate tasks using:
MAESTRO_DELEGATE::{"agent": "agent_name", "prompt": "task description"}

Available agents: claude, gemini, codex

Task: Review the following JavaScript code. Use Claude for refactoring suggestions 
and Codex for performance optimization ideas.

[paste your code here]
```

Expected flow:
1. Gemini analyzes code
2. Gemini outputs: `MAESTRO_DELEGATE::{"agent": "claude", "prompt": "Suggest refactoring improvements for: [code]"}`
3. Maestro captures Claude's response and feeds it back to Gemini
4. Gemini outputs: `MAESTRO_DELEGATE::{"agent": "codex", "prompt": "Analyze performance and suggest optimizations for: [code]"}`
5. Maestro captures Codex's response
6. Gemini synthesizes all feedback

## Example 2: Documentation Generation

**Primary Agent: Claude**

```
You are primary agent in Maestro. Delegate using:
MAESTRO_DELEGATE::{"agent": "agent_name", "prompt": "task"}

Available: claude, gemini, codex

Generate comprehensive documentation for this codebase. 
Use Gemini to create usage examples.
```

## Example 3: Full Stack Task

**Primary Agent: Codex**

```
You are in Maestro. Delegate: MAESTRO_DELEGATE::{"agent": "name", "prompt": "task"}

Create a REST API for user management.
- Use Claude for architecture design
- Use Gemini for test case generation
```

## Tips for Best Results

1. **Always inform the agent** it's running in Maestro
2. **Provide the delegation format** explicitly
3. **List available agents** for context
4. **Be specific** about which agent should handle which task
5. **Use appropriate agents** for their strengths:
   - Claude: refactoring, architecture, codebase navigation
   - Gemini: automation, content generation, diverse tasks
   - Codex: code generation, completion

