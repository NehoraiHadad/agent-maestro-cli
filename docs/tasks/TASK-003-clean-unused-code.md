# TASK-003: Clean Unused Code

**Status**: 🔴 Not Started
**Priority**: P0 (Critical)
**Estimated Time**: 2-3 hours
**Assignee**: TBD
**Created**: 2025-11-18
**Dependencies**: TASK-002 (must complete first)
**Can Run in Parallel**: No

---

## 📋 Description

Remove or refactor unused code based on the wrapper strategy decided in TASK-002. Clean up constants, types, and logic for agents that are not directly supported.

## 🎯 Objectives

1. Remove unused agent constants (if Pure Wrapper chosen)
2. Clean up unused execution logic
3. Remove dead code paths
4. Simplify codebase
5. Reduce bundle size

## 📍 Files to Review

### If Pure Wrapper Strategy (Option A):

**Files to Clean**:
- `src/shared/constants/agents.ts` - Remove Codex/Gemini or mark deprecated
- `src/domain/entities/Agent.ts` - Remove Codex/Gemini specific logic in getExecutionArgs
- `src/features/streaming/parsers/CodexParser.ts` - Consider removal
- `src/features/streaming/parsers/GeminiParser.ts` - Consider removal
- `src/features/streaming/parsers/ParserFactory.ts` - Remove references

**Code Patterns to Remove**:
```typescript
// Remove Codex-specific logic
if (this.name === 'codex' && options?.continueSession) {
  // ...
}

// Remove Gemini constants
export const AGENT_NAMES = {
  CLAUDE: 'claude',
  GEMINI: 'gemini',  // ❌ Remove
  CODEX: 'codex'     // ❌ Remove
}
```

### If Hybrid Strategy (Option B):

**No removal needed** - instead complete implementations

## 📝 Implementation Steps

1. **Analyze Dependencies**
   - List all files that reference removed agents
   - Check for imports and type references
   - Identify dead code paths

2. **Remove Constants**
   - Update `agents.ts`
   - Remove from type definitions
   - Update enums

3. **Clean Parsers**
   - Decide if CodexParser/GeminiParser should be kept
   - Update ParserFactory
   - Remove tests for unused parsers

4. **Simplify Agent Logic**
   - Clean getExecutionArgs method
   - Remove conditional branches
   - Simplify type unions

5. **Update Tests**
   - Remove tests for removed functionality
   - Update snapshots
   - Ensure coverage doesn't drop

6. **Run Linters**
   - Fix any unused imports
   - Remove commented code
   - Clean up TODOs

## 🧪 Testing

```bash
# Ensure build succeeds
npm run build

# Run all tests
npm test

# Check for unused exports
npx ts-prune

# Check bundle size
npm run build && du -sh dist/
```

## ✅ Acceptance Criteria

- [ ] No references to removed agents in code
- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] No unused imports (tsc --noUnusedLocals)
- [ ] Build succeeds
- [ ] Bundle size reduced (if applicable)
- [ ] Code coverage maintained

## 📦 Deliverables

1. Cleaned codebase
2. Updated tests
3. List of removed files/functions

## 🚨 Risks & Considerations

- **Risk**: Accidentally remove code that's used
- **Mitigation**: Search entire codebase before removing
- **Risk**: Break existing functionality
- **Mitigation**: Run full test suite

## 📚 References

- TASK-002 decision
- TypeScript unused code detection
- Bundle analyzer results

## 🔄 Post-Completion

After completing this task:
1. Update `docs/tasks/README.md` - mark TASK-003 as ✅ Completed
2. Delete this file
3. Commit with message: "chore: remove unused code based on wrapper strategy (TASK-003)"
4. Note bundle size reduction in commit message
