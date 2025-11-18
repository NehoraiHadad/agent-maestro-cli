# TASK-001: Remove/Simplify Stream Parsers

## 📌 Overview
**Priority**: 🔴 CRITICAL
**Status**: ⏳ Pending
**Estimated Time**: 2-3 hours
**Dependencies**: None
**Can Run in Parallel**: Yes (Group A)

---

## 🎯 Goal
Simplify or remove the complex stream parsers (ClaudeParser, CodexParser, GeminiParser) that try to parse and interpret agent output. Since AgentMaestro is a wrapper, the output should pass through with minimal processing.

---

## ❌ Problem
The current parsers are over-engineered for a simple wrapper:
- `ClaudeParser.ts`: 207 lines - complex event parsing, delegation detection
- `CodexParser.ts`: 133 lines - command execution parsing
- `GeminiParser.ts`: 86 lines - event type parsing

This adds unnecessary complexity and couples maestro to internal agent implementations.

---

## ✅ Solution
Replace complex parsing with simple pass-through logic.

---

## 📂 Files to Modify

### Delete (or heavily simplify):
1. `src/features/streaming/parsers/ClaudeParser.ts`
2. `src/features/streaming/parsers/CodexParser.ts`
3. `src/features/streaming/parsers/GeminiParser.ts`

### Modify:
1. `src/features/streaming/parsers/BaseParser.ts` - simplify to basic pass-through
2. `src/features/streaming/parsers/ParserFactory.ts` - simplify factory logic
3. `src/features/streaming/StreamProcessor.ts` - remove complex processing
4. `src/features/orchestration/Maestro.ts` - remove parser usage

---

## 🔧 Implementation Steps

### Step 1: Backup Current Implementation
```bash
cp src/features/streaming/parsers/ClaudeParser.ts src/features/streaming/parsers/ClaudeParser.ts.backup
cp src/features/streaming/parsers/CodexParser.ts src/features/streaming/parsers/CodexParser.ts.backup
cp src/features/streaming/parsers/GeminiParser.ts src/features/streaming/parsers/GeminiParser.ts.backup
```

### Step 2: Simplify BaseParser
Replace with minimal interface:
```typescript
// src/features/streaming/parsers/BaseParser.ts
export abstract class BaseParser {
  /**
   * Simple pass-through with optional basic status
   */
  abstract parseEvent(data: string): { type: 'data' | 'complete' | 'error'; content: string } | null;
}
```

### Step 3: Simplify Agent Parsers
Each parser should just:
- Detect completion (exit code received)
- Pass data through
- No complex event parsing

Example for ClaudeParser:
```typescript
export class ClaudeParser extends BaseParser {
  parseEvent(data: string): { type: 'data'; content: string } | null {
    if (!data) return null;
    return { type: 'data', content: data };
  }
}
```

### Step 4: Update StreamProcessor
Remove complex event processing:
```typescript
// src/features/streaming/StreamProcessor.ts
processEvent(agentName: string, data: string): StatusUpdate | null {
  // Simple: just return basic status
  return {
    status: 'processing...',
    color: this.getAgentColor(agentName)
  };
}
```

### Step 5: Update Maestro.ts
Remove parser-dependent logic in `setupEventHandlers()`:
```typescript
// Before:
const statusUpdate = this.streamProcessor.processEvent(this.primaryAgent.name, line);

// After:
// Just show simple spinner, no status updates
```

### Step 6: Remove Delegation Detection
Delete these methods from ClaudeParser:
- `isDelegationCompletion()`
- `clearDelegations()`
- `activeDelegations` Set

### Step 7: Test
```bash
npm run build
npm run test
# Manual test:
node dist/cli/index.js -m "hello"
```

---

## ✅ Acceptance Criteria

- [ ] ClaudeParser is simplified to <50 lines (or removed)
- [ ] CodexParser is simplified to <50 lines (or removed)
- [ ] GeminiParser is simplified to <50 lines (or removed)
- [ ] StreamProcessor no longer does complex event parsing
- [ ] Agent output passes through with minimal modification
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Manual test shows output correctly

---

## 🔍 Verification

After completion, verify:
```bash
# 1. Check file sizes
wc -l src/features/streaming/parsers/*.ts

# 2. Build
npm run build

# 3. Tests
npm run test

# 4. Manual test
node dist/cli/index.js -m "test message"
```

Expected: Clean pass-through of agent output, no parsing errors.

---

## 🚨 Rollback Plan

If issues occur:
```bash
cp src/features/streaming/parsers/ClaudeParser.ts.backup src/features/streaming/parsers/ClaudeParser.ts
cp src/features/streaming/parsers/CodexParser.ts.backup src/features/streaming/parsers/CodexParser.ts
cp src/features/streaming/parsers/GeminiParser.ts.backup src/features/streaming/parsers/GeminiParser.ts
npm run build
```

---

## 📝 Post-Completion

After completing this task:
1. Update `docs/tasks/STATUS.md`:
   - Change TASK-001 status to ✅ Complete
   - Add completion date to Change Log
2. Delete this file: `docs/tasks/TASK-001-remove-parsers.md`
3. Commit changes:
```bash
git add .
git commit -m "refactor: simplify stream parsers (TASK-001)"
```

---

## 💡 Notes

- This is a CRITICAL task - simplifies the core complexity
- Can run in parallel with TASK-002, TASK-004, TASK-005, TASK-006, TASK-007
- TASK-003 depends on this being completed first
- Keep ParserFactory minimal - might be needed for basic routing
