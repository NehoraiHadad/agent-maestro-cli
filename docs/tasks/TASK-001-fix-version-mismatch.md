# TASK-001: Fix Version Mismatch

**Status**: 🔴 Not Started
**Priority**: P0 (Critical)
**Estimated Time**: 15 minutes
**Assignee**: TBD
**Created**: 2025-11-18
**Dependencies**: None
**Can Run in Parallel**: Yes

---

## 📋 Description

Fix version inconsistency between `package.json` (2.1.0) and `src/cli/index.ts` (2.0.0).

## 🎯 Objectives

1. Update hardcoded version in CLI to read from package.json
2. Ensure version consistency across all files
3. Add validation test to prevent future mismatches

## 📍 Affected Files

- `src/cli/index.ts` (line 21)
- Potentially: `README.md`, `CHANGELOG.md`

## 🔍 Current State

```typescript
// src/cli/index.ts:21
program
  .name('maestro')
  .description('🎭 Multi-agent AI orchestration CLI')
  .version('2.0.0');  // ❌ Hardcoded, doesn't match package.json
```

## ✅ Desired State

```typescript
// src/cli/index.ts
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../../package.json'), 'utf-8')
);

program
  .name('maestro')
  .description('🎭 Multi-agent AI orchestration CLI')
  .version(packageJson.version);  // ✅ Dynamic from package.json
```

## 📝 Implementation Steps

1. **Update CLI Entry Point**
   - Add imports for fs, path, and url
   - Read package.json dynamically
   - Extract version from parsed JSON
   - Apply to `.version()` call

2. **Verify Consistency**
   - Check if version appears elsewhere
   - Update any other hardcoded references

3. **Add Test**
   - Create unit test to ensure CLI version matches package.json
   - File: `tests/unit/cli/version.test.ts`

4. **Test Manually**
   - Run `npm run build`
   - Run `node dist/cli/index.js --version`
   - Verify output is `2.1.0`

5. **Update Documentation**
   - Update CHANGELOG.md with fix note

## 🧪 Testing

```bash
# Build
npm run build

# Test version command
node dist/cli/index.js --version
# Expected output: 2.1.0

# Test help command
node dist/cli/index.js --help
# Should display correct version in header
```

## ✅ Acceptance Criteria

- [ ] CLI displays version 2.1.0
- [ ] Version is read dynamically from package.json
- [ ] No hardcoded version strings in code
- [ ] Unit test added for version consistency
- [ ] All tests pass
- [ ] CHANGELOG updated

## 📦 Deliverables

1. Updated `src/cli/index.ts`
2. New test file: `tests/unit/cli/version.test.ts`
3. Updated `CHANGELOG.md`

## 🚨 Risks & Considerations

- **Risk**: File path resolution might differ in production/dev
- **Mitigation**: Use proper path resolution with `fileURLToPath`

## 📚 References

- package.json version: 2.1.0
- Current CLI version: 2.0.0

## 🔄 Post-Completion

After completing this task:
1. Update `docs/tasks/README.md` - mark TASK-001 as ✅ Completed
2. Delete this file: `docs/tasks/TASK-001-fix-version-mismatch.md`
3. Commit with message: "fix: synchronize CLI version with package.json (TASK-001)"
4. Move to next task
