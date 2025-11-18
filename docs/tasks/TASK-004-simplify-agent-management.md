# TASK-004: Simplify Agent Management

## 📌 Overview
**Priority**: 🔴 CRITICAL
**Status**: ⏳ Pending
**Estimated Time**: 2-3 hours
**Dependencies**: None
**Can Run in Parallel**: Yes (Group A)

---

## 🎯 Goal
Simplify or remove AgentRepository since maestro is a wrapper for Claude Code only. The current implementation manages 3 agents (Claude, Codex, Gemini) but maestro doesn't orchestrate them - Claude Code does.

---

## ❌ Problem
`AgentRepository` currently manages all three agents:
```typescript
const defaultAgents: AgentType[] = [
  { name: 'claude', ... },
  { name: 'gemini', ... },
  { name: 'codex', ... }
];
```

This is misleading because:
- Maestro **only wraps Claude Code** - it doesn't call Codex/Gemini directly
- Claude Code handles Codex/Gemini via its **Subagent** system
- This creates confusion about maestro's role

---

## ✅ Solution

**Option A (Recommended)**: Keep only Claude in AgentRepository
**Option B**: Keep all agents but clarify they're for the `delegate` command only

Choose **Option A** for true wrapper simplicity.

---

## 📂 Files to Modify

1. `src/domain/repositories/AgentRepository.ts` - Remove Codex/Gemini
2. `src/shared/constants/agents.ts` - Update constants
3. `src/cli/commands/DelegateCommand.ts` - May need updates (see Option B)
4. `src/cli/commands/InfoCommand.ts` - Update agent info
5. `src/cli/commands/ListCommand.ts` - Update agent list

---

## 🔧 Implementation Steps (Option A - Recommended)

### Step 1: Update AgentRepository.ts

**File**: `src/domain/repositories/AgentRepository.ts`

**Current (Line 24-94)**:
```typescript
private initializeDefaultAgents(): void {
  const defaultAgents: AgentType[] = [
    { name: 'claude', ... },
    { name: 'gemini', ... },  // Remove
    { name: 'codex', ... }    // Remove
  ];
  // ...
}
```

**Replace with**:
```typescript
private initializeDefaultAgents(): void {
  const defaultAgents: AgentType[] = [
    {
      name: AGENT_NAMES.CLAUDE,
      displayName: 'Claude Code',
      command: 'claude',
      description: 'Anthropic Claude - Primary agent for AgentMaestro wrapper',
      capabilities: [
        'Code refactoring',
        'Codebase analysis',
        'Architectural planning',
        'File editing',
        'MCP integration',
        'Native Subagent delegation to Codex/Gemini'
      ],
      flags: {
        prompt: '--print',
        json: ['--output-format', 'json'],
        stream: ['--output-format', 'stream-json', '--verbose']
      },
      requiresAuth: true,
      authType: 'Claude Pro/Max subscription',
      packageName: AGENT_PACKAGES.CLAUDE,
      color: AGENT_COLORS.CLAUDE
    }
    // Only Claude - remove Gemini and Codex
  ];

  defaultAgents.forEach(config => {
    const agent = new Agent(config);
    this.agents.set(agent.name, agent);
  });
}
```

### Step 2: Update DelegateCommand.ts

**File**: `src/cli/commands/DelegateCommand.ts`

This command allows direct delegation like `maestro delegate codex "task"`.

**Decision**: Keep it but clarify it's experimental/direct access, OR remove it entirely.

**Recommended**: Remove the command or update it to only support Claude:
```typescript
// Option 1: Remove DelegateCommand entirely (simplest)
// Delete src/cli/commands/DelegateCommand.ts
// Remove from src/cli/index.ts

// Option 2: Update to only support Claude
static async execute(agent: string, task: string): Promise<void> {
  if (agent !== 'claude') {
    this.logger.error(`AgentMaestro only supports Claude Code.`);
    this.logger.info(`Tip: Claude can delegate to Codex/Gemini automatically via Subagents.`);
    process.exit(1);
  }
  // Continue with Claude...
}
```

### Step 3: Update InfoCommand.ts

**File**: `src/cli/commands/InfoCommand.ts`

Update to only show Claude info:
```typescript
static async execute(agentName: string): Promise<void> {
  if (agentName !== 'claude') {
    this.logger.error(`AgentMaestro only wraps Claude Code.`);
    this.logger.info(`For Codex/Gemini, Claude delegates automatically via Subagents.`);
    process.exit(1);
  }
  // Show Claude info...
}
```

### Step 4: Update ListCommand.ts

**File**: `src/cli/commands/ListCommand.ts`

Only list Claude:
```typescript
static async execute(): Promise<void> {
  this.logger.separator();
  this.logger.maestro('AgentMaestro - Wrapper for Claude Code');
  this.logger.separator();

  const repository = new AgentRepository();
  const claude = repository.findByName('claude');

  console.log(chalk.blue(`\n${claude.displayName} (${claude.command})`));
  console.log(`  ${claude.description}`);
  console.log(`  Package: ${claude.packageName}`);
  console.log(`  Auth: ${claude.authType}`);

  this.logger.separator();
  this.logger.info('\n💡 Claude Code can delegate to Codex/Gemini via native Subagents\n');
}
```

### Step 5: Update constants

**File**: `src/shared/constants/agents.ts`

Keep all constants (for documentation) but clarify:
```typescript
/**
 * Agent names
 * Note: AgentMaestro only wraps Claude Code directly.
 * Codex and Gemini are accessed via Claude's Subagent system.
 */
export const AGENT_NAMES = {
  CLAUDE: 'claude',
  GEMINI: 'gemini',  // Keep for reference
  CODEX: 'codex'     // Keep for reference
} as const;
```

---

## 🔧 Implementation Steps (Option B - Keep All)

If you decide to keep Codex/Gemini for the `delegate` command:

### Step 1: Add documentation to AgentRepository

**File**: `src/domain/repositories/AgentRepository.ts`

Add clear comments:
```typescript
/**
 * Agent Repository
 *
 * Note: AgentMaestro is a wrapper for Claude Code.
 * - Claude is the primary agent (used by 'maestro' command)
 * - Codex and Gemini are available via 'maestro delegate' for direct access
 * - Claude can also delegate to Codex/Gemini automatically via Subagents
 */
export class AgentRepository {
  // ...
}
```

### Step 2: Keep all agents but clarify

Update descriptions to clarify they're for direct delegation only.

---

## ✅ Acceptance Criteria

### For Option A (Recommended):
- [ ] AgentRepository only contains Claude
- [ ] `maestro list` shows only Claude
- [ ] `maestro info <agent>` only works for Claude
- [ ] `maestro delegate` command removed or Claude-only
- [ ] All references to Gemini/Codex removed from wrapper logic
- [ ] Documentation clarifies Claude delegates via Subagents
- [ ] Tests updated
- [ ] Build succeeds

### For Option B:
- [ ] Clear documentation about wrapper vs. delegation
- [ ] UI messages clarify the difference
- [ ] No confusion about maestro's role

---

## 🔍 Verification

```bash
# Build
npm run build

# Test commands
node dist/cli/index.js list
# Expected: Only Claude listed (Option A) or clear distinction (Option B)

node dist/cli/index.js info claude
# Expected: Works

node dist/cli/index.js info codex
# Expected: Error (Option A) or clarification (Option B)

# Run tests
npm run test
```

---

## 🚨 Rollback Plan

If issues occur:
```bash
git checkout HEAD -- src/domain/repositories/AgentRepository.ts
git checkout HEAD -- src/cli/commands/
npm run build
```

---

## 📝 Post-Completion

After completing this task:
1. Update `docs/tasks/STATUS.md`:
   - Change TASK-004 status to ✅ Complete
   - Add completion date to Change Log
   - Note which option was chosen (A or B)
2. Delete this file: `docs/tasks/TASK-004-simplify-agent-management.md`
3. Commit changes:
```bash
git add .
git commit -m "refactor: simplify agent management (TASK-004, Option A/B)"
```

---

## 💡 Notes

- **Recommended**: Choose **Option A** for true wrapper simplicity
- Can run in parallel with TASK-001, TASK-002, TASK-005, TASK-006, TASK-007
- This clarifies maestro's core purpose
- Update README.md to reflect the changes
