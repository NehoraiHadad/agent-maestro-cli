# TASK-003: Remove Delegation Detection

## 📌 Overview
**Priority**: 🔴 CRITICAL
**Status**: ⏳ Pending
**Estimated Time**: 1-2 hours
**Dependencies**: TASK-001 (Remove/Simplify Parsers)
**Can Run in Parallel**: No (Must wait for TASK-001)

---

## 🎯 Goal
Remove all code that attempts to detect and track delegation from maestro. Delegation is handled by Claude Code's native Subagent system, not by maestro.

---

## ❌ Problem
Maestro currently tries to detect when Claude Code delegates to Codex/Gemini:
- Tracks active delegations in `ClaudeParser.ts`
- Detects delegation completion patterns
- Shows "delegation started/completed" messages

This is wrong because:
- **Claude Code** manages delegation internally (via Subagents)
- Maestro is just a **wrapper** - it shouldn't know about delegation
- Creates tight coupling to Claude's internal implementation

---

## ✅ Solution
Remove all delegation detection logic from maestro.

---

## 📂 Files to Modify

1. `src/features/streaming/parsers/ClaudeParser.ts` - Remove delegation tracking
2. `src/features/ui/spinner/StatusUpdater.ts` - Remove delegation notifications
3. `src/features/orchestration/Maestro.ts` - Remove delegation metadata
4. `src/shared/types/streaming.types.ts` - Remove delegation types (if any)

---

## 🔧 Implementation Steps

### Step 1: Remove from ClaudeParser.ts

**File**: `src/features/streaming/parsers/ClaudeParser.ts`

**Delete these elements**:
```typescript
// Line 15: Remove
private activeDelegations: Set<string> = new Set();

// Line 98-101: Delete method
clearDelegations(): void {
  this.activeDelegations.clear();
}

// Line 116-126: Delete method
private isDelegationCompletion(content: string): boolean {
  const delegationPatterns = [
    /task.*completed/i,
    /delegation.*complete/i,
    /subagent.*finished/i,
    /(codex|gemini).*done/i
  ];
  return delegationPatterns.some(pattern => pattern.test(content));
}

// Line 134-144: Remove delegation detection from formatToolUseStatus
if (toolName === 'Task' && input?.subagent_type) {
  const subagentType = input.subagent_type as string;
  if (!this.activeDelegations.has(subagentType)) {
    this.activeDelegations.add(subagentType);
    return `🔄 DELEGATION_START: ${this.formatSubagentName(subagentType)}`;
  }
  return `delegating to ${this.formatSubagentName(subagentType)}...`;
}

// Line 166-174: Delete method
private formatSubagentName(subagentType: string): string {
  if (subagentType === 'codex-delegator') return 'Codex';
  if (subagentType === 'gemini-delegator') return 'Gemini';
  return subagentType.charAt(0).toUpperCase() + subagentType.slice(1);
}
```

**After removal**, `formatToolUseStatus()` should just return generic status:
```typescript
private formatToolUseStatus(toolName: string, input?: Record<string, unknown>): string {
  // Just show basic tool usage, no special delegation handling
  if (['Read', 'Edit', 'Write'].includes(toolName) && input?.file_path) {
    const filename = extractFilename(input.file_path as string);
    return `${toolName.toLowerCase()}: ${filename}`;
  }

  if (toolName === 'Bash' && input?.command) {
    const cmd = (input.command as string).substring(0, 40);
    return `running: ${cmd}...`;
  }

  return `using ${toolName}...`;
}
```

### Step 2: Remove from StatusUpdater.ts

**File**: `src/features/ui/spinner/StatusUpdater.ts`

Search for any "DELEGATION_START" or delegation-specific handling and remove it.

If there's code like:
```typescript
if (status.includes('DELEGATION_START')) {
  // Show delegation notification
}
```

Remove it completely.

### Step 3: Clean up Maestro.ts

**File**: `src/features/orchestration/Maestro.ts`

**Line 520**: Remove delegation from result:
```typescript
// Before:
resolve({
  agent: this.primaryAgent.name,
  content: cleanedOutput,
  delegations: [], // Remove this field
  exitCode
});

// After:
resolve({
  agent: this.primaryAgent.name,
  content: cleanedOutput,
  exitCode
});
```

### Step 4: Update Types

**File**: `src/shared/types/agent.types.ts` or similar

If `AgentExecutionResult` has a `delegations` field, remove it:
```typescript
// Before:
export interface AgentExecutionResult {
  agent: AgentName;
  content: string;
  delegations: DelegationInfo[]; // Remove
  exitCode: number;
}

// After:
export interface AgentExecutionResult {
  agent: AgentName;
  content: string;
  exitCode: number;
}
```

### Step 5: Remove unused types

Check `src/shared/types/delegation.types.ts` - if it's only for delegation detection, delete the entire file.

**Keep only if** it's used for the `delegate` command (TASK-004 will determine this).

---

## ✅ Acceptance Criteria

- [ ] No `activeDelegations` tracking in any file
- [ ] No `isDelegationCompletion()` method
- [ ] No `formatSubagentName()` method
- [ ] No delegation-specific status updates
- [ ] `AgentExecutionResult` has no `delegations` field
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Manual test shows no delegation messages from maestro

---

## 🔍 Verification

Search for any remaining delegation logic:
```bash
# Search for delegation-related code
grep -r "delegation" src/
grep -r "Delegation" src/
grep -r "subagent" src/ --include="*.ts" | grep -v "// " | grep -v "subagent_type"

# Build and test
npm run build
npm run test

# Manual test
node dist/cli/index.js -m "hello"
```

Expected: No delegation detection, clean wrapper behavior.

---

## 🚨 Rollback Plan

If issues occur:
```bash
git checkout HEAD -- src/features/streaming/parsers/ClaudeParser.ts
git checkout HEAD -- src/features/orchestration/Maestro.ts
npm run build
```

---

## 📝 Post-Completion

After completing this task:
1. Update `docs/tasks/STATUS.md`:
   - Change TASK-003 status to ✅ Complete
   - Add completion date to Change Log
2. Delete this file: `docs/tasks/TASK-003-remove-delegation-detection.md`
3. Commit changes:
```bash
git add .
git commit -m "refactor: remove delegation detection logic (TASK-003)"
```

---

## 💡 Notes

- **IMPORTANT**: This task depends on TASK-001 being completed first
- Cannot run in parallel - must wait for parsers to be simplified
- This removes a major source of complexity
- Claude Code will still delegate via Subagents - maestro just won't know about it
