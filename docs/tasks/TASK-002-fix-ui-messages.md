# TASK-002: Fix UI Messages

## 📌 Overview
**Priority**: 🔴 CRITICAL
**Status**: ⏳ Pending
**Estimated Time**: 1-2 hours
**Dependencies**: None
**Can Run in Parallel**: Yes (Group A)

---

## 🎯 Goal
Fix misleading UI messages that suggest maestro manages delegation, when in reality Claude Code handles delegation through its native Subagent system.

---

## ❌ Problem
Current messages incorrectly imply maestro controls delegation:
```
🔄 Auto-delegation: Enabled (Codex & Gemini)
```

This is misleading because:
- **Claude Code** does the delegation (via Subagents), not maestro
- Maestro is just a **wrapper** - it doesn't manage agents
- Users think maestro is doing orchestration when it's just passing through

---

## ✅ Solution
Update all UI messages to reflect maestro's true role as a wrapper.

---

## 📂 Files to Modify

1. `src/features/ui/session/SessionDisplay.ts` - Welcome message
2. `src/features/ui/logger/ConsoleLogger.ts` - Log messages
3. `src/cli/commands/StartCommand.ts` - Start message
4. `src/features/ui/spinner/StatusUpdater.ts` - Status messages
5. `src/features/ui/spinner/Spinner.ts` - Spinner text

---

## 🔧 Implementation Steps

### Step 1: Fix SessionDisplay.ts

**File**: `src/features/ui/session/SessionDisplay.ts`

**Current (Line 19-22)**:
```typescript
showWelcome(): void {
  this.logger.separator();
  this.logger.maestro('Interactive Session - Claude Code Wrapper');
  this.logger.separator();
  this.logger.info('🤖 Primary Agent: Claude Code');
  this.logger.info('🔄 Auto-delegation: Enabled (Codex & Gemini)');
  // ...
}
```

**Replace with**:
```typescript
showWelcome(): void {
  this.logger.separator();
  this.logger.maestro('AgentMaestro - Wrapper for Claude Code');
  this.logger.separator();
  this.logger.info('🤖 Running: Claude Code (native interface)');
  this.logger.info('💡 Tip: Claude can delegate to Codex/Gemini via Subagents');
  // ...
}
```

### Step 2: Fix StartCommand.ts

**File**: `src/cli/commands/StartCommand.ts`

**Current (Line 75-77)**:
```typescript
this.logger.separator();
this.logger.maestro('AgentMaestro - Claude Code Wrapper');
this.logger.startingWrapper();
this.logger.separator();
```

**Replace with**:
```typescript
this.logger.separator();
this.logger.maestro('AgentMaestro - Wrapper for Claude Code');
this.logger.info('🚀 Starting Claude Code session...');
this.logger.separator();
```

### Step 3: Fix ConsoleLogger.ts

**File**: `src/features/ui/logger/ConsoleLogger.ts`

Check for any methods like `startingWrapper()` and simplify them.

If it exists, replace:
```typescript
startingWrapper(): void {
  console.log(chalk.blue('🚀 Starting wrapper for Claude Code...'));
}
```

With:
```typescript
startingWrapper(): void {
  console.log(chalk.blue('🚀 Launching Claude Code...'));
}
```

### Step 4: Fix StatusUpdater.ts

**File**: `src/features/ui/spinner/StatusUpdater.ts`

Remove any "delegation detected" messages or simplify to:
```typescript
// Instead of: "🔄 Delegating to Codex..."
// Use: "🤖 Claude is working..."
```

### Step 5: Fix Spinner messages in Maestro.ts

**File**: `src/features/orchestration/Maestro.ts` (Line 400)

**Current**:
```typescript
this.spinner.start(`🤖 [Claude] Processing your request...`, this.primaryAgent.color);
```

**Keep as is** (this is fine) or simplify to:
```typescript
this.spinner.start(`🤖 Claude Code is processing...`, this.primaryAgent.color);
```

### Step 6: Remove misleading success messages

**File**: `src/features/orchestration/Maestro.ts` (Line 491)

**Current**:
```typescript
this.spinner.succeed(`🤖 [Claude] Task completed successfully`);
```

**Simplify to**:
```typescript
this.spinner.succeed(`✓ Claude Code completed`);
```

---

## ✅ Acceptance Criteria

- [ ] No messages claiming maestro does "auto-delegation"
- [ ] All messages clearly indicate maestro is a wrapper
- [ ] Messages explain Claude Code's native capabilities (Subagents)
- [ ] No confusion about who manages what
- [ ] Build succeeds
- [ ] Manual test shows correct messages

---

## 🔍 Verification

Run maestro and verify messages:
```bash
npm run build
node dist/cli/index.js

# Check welcome message
# Expected:
# AgentMaestro - Wrapper for Claude Code
# 🤖 Running: Claude Code (native interface)
# 💡 Tip: Claude can delegate to Codex/Gemini via Subagents
```

---

## 📝 Message Guidelines

When writing new UI messages, follow these principles:

### ✅ Good Messages:
- "Running Claude Code"
- "Claude Code is processing..."
- "Wrapper for Claude Code"
- "Claude can delegate via Subagents"
- "Launching Claude Code session"

### ❌ Bad Messages:
- "Auto-delegation enabled"
- "Maestro is delegating to Codex"
- "Orchestrating agents"
- "Managing multi-agent workflow"
- "Maestro detected delegation"

---

## 🚨 Rollback Plan

If issues occur, revert specific file:
```bash
git checkout HEAD -- src/features/ui/session/SessionDisplay.ts
npm run build
```

---

## 📝 Post-Completion

After completing this task:
1. Update `docs/tasks/STATUS.md`:
   - Change TASK-002 status to ✅ Complete
   - Add completion date to Change Log
2. Delete this file: `docs/tasks/TASK-002-fix-ui-messages.md`
3. Commit changes:
```bash
git add .
git commit -m "fix: update UI messages to reflect wrapper role (TASK-002)"
```

---

## 💡 Notes

- This is a CRITICAL task - fixes user confusion
- Can run in parallel with all other tasks
- Quick to implement, high impact on UX
- Test manually to ensure messages are clear
