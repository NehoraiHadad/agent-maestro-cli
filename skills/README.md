# AgentMaestro Skills

This directory contains Skills for Claude Code that enhance AgentMaestro's capabilities.

## 📦 Available Skills

### maestro-delegation-advisor

**Purpose:** Expert system for intelligent task delegation between AI agents (Claude, Codex, Gemini).

**What it does:**
- Analyzes task requirements and recommends the best agent
- Provides decision framework with confidence scores
- Includes real-world examples and proven patterns
- References performance benchmarks (SWE-bench, HumanEval)

**When Claude loads this skill:**
- Automatically at Claude Code startup (progressive disclosure)
- Only full content loaded when delegation is relevant
- ~50 tokens overhead when inactive, ~3000 when active

**Files:**
- `SKILL.md` - Main skill with decision framework
- `examples/` - Detailed examples of common delegation patterns
  - `security-audit.md` - Security analysis delegation
  - `feature-implementation.md` - Multi-phase feature development
- `reference/` - Supporting documentation
  - `benchmarks.md` - Agent performance metrics

## 🚀 Installation

From AgentMaestro root directory:

```bash
# Install to Claude Code
maestro skills install

# Check status
maestro skills status

# Uninstall
maestro skills uninstall
```

Skills are installed to: `~/.claude/skills/maestro-delegation-advisor/`

## 🎯 How Skills Work

### Progressive Disclosure Architecture

1. **Startup (Always):**
   - Claude scans `~/.claude/skills/*/SKILL.md`
   - Loads only YAML frontmatter (name + description)
   - Cost: ~50 tokens per skill

2. **Task Relevant (On Demand):**
   - Claude detects task matches skill description
   - Loads full SKILL.md content
   - Cost: ~3000 tokens (only when needed)

3. **Deep Dive (Optional):**
   - Claude can read examples/ and reference/ files
   - Only loads specific files needed for task
   - Cost: Variable, but targeted

### Example Flow

```
User: "Analyze authentication system for security issues"
  ↓
Claude (sees skill metadata):
  "maestro-delegation-advisor: Expert system for deciding delegation..."
  ↓
Claude (loads full SKILL.md):
  - Reads agent capabilities
  - Sees: "Security audit → Claude (92/100, 44% faster)"
  - Applies decision framework
  ↓
Claude (outputs):
  [[DELEGATE:claude]]
  Perform comprehensive security audit...
  [[/DELEGATE]]
  ↓
AgentMaestro (detects [[DELEGATE:...]]):
  - Spawns claude-code CLI
  - Executes delegation
  - Returns results
```

## ✨ Benefits

### For Users
- ✅ **Zero configuration** - Install once, works automatically
- ✅ **Smarter decisions** - Claude chooses optimal agent
- ✅ **Context efficient** - Minimal token overhead
- ✅ **Easy to update** - Edit SKILL.md, no code changes

### For AgentMaestro
- ✅ **Separation of concerns** - Logic in skill, not code
- ✅ **Community driven** - Easy to share improvements
- ✅ **Extensible** - Add more skills without code changes
- ✅ **Backwards compatible** - Works with or without skills

## 📚 Customization

You can customize the skill by editing:

```bash
~/.claude/skills/maestro-delegation-advisor/SKILL.md
```

**Common customizations:**
- Add your own agent configurations
- Include project-specific delegation patterns
- Add custom examples from your workflows
- Adjust confidence scores based on experience

**After editing:**
- Restart Claude Code to reload changes
- No need to reinstall or rebuild AgentMaestro

## 🔍 Debugging

**Check if skill is installed:**
```bash
maestro skills status
```

**View skill content:**
```bash
cat ~/.claude/skills/maestro-delegation-advisor/SKILL.md
```

**Check Claude is loading it:**
When you start Claude Code, it should scan all skills in `~/.claude/skills/`.
You won't see explicit confirmation, but the skill will be available for use.

**Verify it's working:**
Run maestro with Claude and give it a task that requires delegation:
```bash
maestro --agent claude
> Analyze our security vulnerabilities and implement fixes
```

Claude should output `[[DELEGATE:...]]` with appropriate agent selection based on the skill's guidance.

## 🤝 Contributing

To improve the skill:

1. Edit `skills/maestro-delegation-advisor/SKILL.md` in this repo
2. Test your changes:
   ```bash
   maestro skills uninstall
   maestro skills install
   ```
3. Submit a PR with your improvements

## 📖 References

- [Claude Skills Documentation](https://docs.claude.com/en/docs/claude-code/skills)
- [Anthropic Skills Repository](https://github.com/anthropics/skills)
- [AgentMaestro Delegation Design](../DELEGATION_DESIGN.md)

---

**Note:** Skills are a Claude Code feature. They only work when Claude is the primary agent. Codex and Gemini do not currently support Skills.
