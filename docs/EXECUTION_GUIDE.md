# 🚀 Execution Guide - Code Improvement Tasks

> **Purpose:** Ready-to-use prompts for executing code improvement tasks sequentially
> **Created:** 2025-11-17
> **For:** AgentMaestro Code Quality & Security Improvements

---

## 📖 How to Use This Guide

1. **Run tasks in order** (Task 01 → Task 02 → ... → Task 08)
2. **One task at a time** - Wait for completion before starting the next
3. **Verify after each task:**
   - ✅ Task file deleted from `docs/tasks/`
   - ✅ `docs/TASKS_MASTER.md` updated
   - ✅ `npm run build` passes
   - ✅ Tests pass (when applicable)
4. **Commit after each task** - Keep changes isolated

---

## 🎯 Quick Copy-Paste Prompts

### Task 01: Input Validation (CRITICAL)

```
Please complete Task 01 - Input Validation for User Messages.

Read the complete specification from: docs/tasks/task-01-input-validation.md

Requirements:
1. Create InputValidator class in src/shared/utils/InputValidator.ts
2. Create validation types in src/shared/types/validation.types.ts
3. Integrate validation in Maestro.sendMessage()
4. Create unit tests in tests/unit/InputValidator.test.ts
5. Ensure 100% test coverage for InputValidator

When finished:
- Run: npm run build (must pass)
- Run tests
- Delete: docs/tasks/task-01-input-validation.md
- Update: docs/TASKS_MASTER.md (mark Task 01 as ✅ Completed with today's date)
- Commit: "feat: Add input validation for user messages (Task 01)"

This is CRITICAL for security. Please be thorough.
```

---

### Task 02: Buffer Memory Leak Fix (HIGH)

```
Please complete Task 02 - Fix Unbounded Buffer Growth.

Read the complete specification from: docs/tasks/task-02-buffer-memory-leak.md

Requirements:
1. Create buffer constants in src/shared/constants/buffers.ts
2. Update PTYLifecycle with bounded buffer implementation
3. Add buffer rotation logic
4. Create unit tests in tests/unit/PTYLifecycle.test.ts
5. Verify memory stays bounded under stress test

When finished:
- Run: npm run build (must pass)
- Run tests
- Delete: docs/tasks/task-02-buffer-memory-leak.md
- Update: docs/TASKS_MASTER.md (mark Task 02 as ✅ Completed)
- Commit: "fix: Implement bounded buffer to prevent memory leaks (Task 02)"

High priority stability fix.
```

---

### Task 03: Environment Variable Filtering (HIGH)

```
Please complete Task 03 - Filter Environment Variables in PTY Processes.

Read the complete specification from: docs/tasks/task-03-env-filtering.md

Requirements:
1. Create environment constants in src/shared/constants/environment.ts
2. Update PTYSpawner with environment filtering
3. Add logging for filtering statistics
4. Create unit tests in tests/unit/PTYSpawner.test.ts
5. Manually verify sensitive vars are not leaked

When finished:
- Run: npm run build (must pass)
- Run tests
- Test manually with sensitive env vars
- Delete: docs/tasks/task-03-env-filtering.md
- Update: docs/TASKS_MASTER.md (mark Task 03 as ✅ Completed)
- Commit: "security: Filter environment variables in PTY processes (Task 03)"

High priority security fix.
```

---

### Task 04: Standardize Error Handling (HIGH)

```
Please complete Task 04 - Standardize Error Handling Across Maestro.

Read the complete specification from: docs/tasks/task-04-error-handling.md

Requirements:
1. Create OrchestrationErrors.ts with custom error classes
2. Implement error enrichment helper in Maestro
3. Update all catch blocks in Maestro for consistency
4. Add detailed error logging
5. Create unit tests in tests/unit/OrchestrationErrors.test.ts

When finished:
- Run: npm run build (must pass)
- Run tests
- Delete: docs/tasks/task-04-error-handling.md
- Update: docs/TASKS_MASTER.md (mark Task 04 as ✅ Completed)
- Commit: "refactor: Standardize error handling across Maestro (Task 04)"

Improves debuggability significantly.
```

---

### Task 05: Type Safety Improvements (MEDIUM)

```
Please complete Task 05 - Remove 'any' Types and Improve Type Safety.

Read the complete specification from: docs/tasks/task-05-type-safety.md

Requirements:
1. Install missing @types packages
2. Create UI types in src/shared/types/ui.types.ts
3. Fix KeypressHandler, Spinner, InteractiveMenu, ConsoleLogger
4. Remove all 'any' types and unsafe assertions
5. Verify TypeScript compilation with strict mode

When finished:
- Run: npm run build (must pass with no type errors)
- Test UI components manually
- Delete: docs/tasks/task-05-type-safety.md
- Update: docs/TASKS_MASTER.md (mark Task 05 as ✅ Completed)
- Commit: "refactor: Remove 'any' types and improve type safety (Task 05)"

Verify IDE autocomplete works after changes.
```

---

### Task 06: Metrics Collection with Rotation (MEDIUM)

```
Please complete Task 06 - Add Bounded Metrics Collection.

Read the complete specification from: docs/tasks/task-06-metrics-rotation.md

Requirements:
1. Create metrics constants in src/shared/constants/metrics.ts
2. Update MetricsCollector with bounded collection and rotation
3. Add aggregation methods
4. Implement export functionality
5. Create unit tests in tests/unit/MetricsCollector.test.ts

When finished:
- Run: npm run build (must pass)
- Run tests
- Delete: docs/tasks/task-06-metrics-rotation.md
- Update: docs/TASKS_MASTER.md (mark Task 06 as ✅ Completed)
- Commit: "feat: Add bounded metrics collection with rotation (Task 06)"

Similar pattern to Task 02.
```

---

### Task 07: Event Handler Limits (MEDIUM)

```
Please complete Task 07 - Add Event Handler Limits.

Read the complete specification from: docs/tasks/task-07-event-handler-limits.md

Requirements:
1. Create handler constants in src/shared/constants/handlers.ts
2. Update PTYEventEmitter with max listener enforcement
3. Add handler removal and statistics methods
4. Implement cleanup after exit events
5. Create unit tests in tests/unit/PTYEventEmitter.test.ts

When finished:
- Run: npm run build (must pass)
- Run tests
- Delete: docs/tasks/task-07-event-handler-limits.md
- Update: docs/TASKS_MASTER.md (mark Task 07 as ✅ Completed)
- Commit: "feat: Add event handler limits to prevent memory leaks (Task 07)"

Test error is thrown when exceeding limits.
```

---

### Task 08: Comprehensive Test Suite (CRITICAL)

```
Please complete Task 08 - Implement Comprehensive Test Suite.

Read the complete specification from: docs/tasks/task-08-test-suite.md

Requirements:
1. Install Jest and configure testing infrastructure
2. Create unit tests for ALL core components
3. Create integration tests for end-to-end workflows
4. Achieve 80%+ code coverage for critical paths
5. Ensure all tests are fast (<30s for unit tests)

This is the LARGEST task (2-3 days). Create tests for:
- ConfigManager
- SessionManager
- PTYLifecycle
- PTYEventEmitter
- CircuitBreaker
- RetryManager
- MetricsCollector
- InputValidator
- All error classes

When finished:
- Run: npm run build (must pass)
- Run: npm run test:coverage
- Verify coverage targets met (80%+ lines, 75%+ functions, 70%+ branches)
- Delete: docs/tasks/task-08-test-suite.md
- Update: docs/TASKS_MASTER.md (mark Task 08 as ✅ Completed)
- Commit: "test: Add comprehensive test suite (Task 08)"

Generate coverage report and ensure targets are met.
```

---

## 📋 Execution Checklist

### Before Starting

- [ ] Current branch: `claude/review-code-implementation-015VzRTxen3HtnT8r5CsPZfk`
- [ ] `npm install` completed
- [ ] `npm run build` passes
- [ ] Read `docs/TASKS_MASTER.md` for overview

### After Each Task

```bash
# 1. Verify build passes
npm run build

# 2. Run tests (if they exist)
npm test

# 3. Check task file was deleted
ls docs/tasks/

# 4. Verify TASKS_MASTER updated
git diff docs/TASKS_MASTER.md

# 5. Verify commit was made
git log -1

# 6. Check overall progress
cat docs/TASKS_MASTER.md | grep "Status:"
```

### After All Tasks Complete

- [ ] All 8 tasks marked ✅ in TASKS_MASTER.md
- [ ] `npm run build` passes
- [ ] `npm run test:coverage` shows 80%+ coverage
- [ ] All `docs/tasks/*.md` files deleted
- [ ] All changes committed
- [ ] Push to remote: `git push -u origin claude/review-code-implementation-015VzRTxen3HtnT8r5CsPZfk`

---

## 🎯 Progress Tracker

Mark each task as you complete it:

- [ ] **Task 01:** Input Validation (CRITICAL) - ~2-3 hours
- [ ] **Task 02:** Buffer Memory Leak (HIGH) - ~3-4 hours
- [ ] **Task 03:** Environment Filtering (HIGH) - ~2 hours
- [ ] **Task 04:** Error Handling (HIGH) - ~4-5 hours
- [ ] **Task 05:** Type Safety (MEDIUM) - ~4-6 hours
- [ ] **Task 06:** Metrics Rotation (MEDIUM) - ~2-3 hours
- [ ] **Task 07:** Event Handler Limits (MEDIUM) - ~2-3 hours
- [ ] **Task 08:** Test Suite (CRITICAL) - ~2-3 days

**Total Estimated Time:** 1-2 weeks for senior developer

---

## 🔧 Troubleshooting

### Build Fails

```
Issue: npm run build shows errors
Solution: Read the error messages, fix the TypeScript errors, and retry
```

### Tests Fail

```
Issue: Tests are failing
Solution: Check test output, fix the code or tests, ensure all dependencies are correct
```

### Task File Not Deleted

```
Issue: Agent didn't delete the task file
Solution: Manually delete it: rm docs/tasks/task-XX-name.md
```

### TASKS_MASTER Not Updated

```
Issue: Progress not reflected in TASKS_MASTER.md
Solution: Manually update the status, completion date, and progress table
```

---

## 📊 Recommended Execution Order

These tasks should be executed in the exact order listed (01 → 08):

1. **Task 01** - Input Validation (Security foundation)
2. **Task 03** - Env Filtering (Security)
3. **Task 02** - Buffer Leak (Stability)
4. **Task 04** - Error Handling (Foundation for others)
5. **Task 05** - Type Safety (Code quality)
6. **Task 06** - Metrics Rotation (Performance)
7. **Task 07** - Event Handlers (Performance)
8. **Task 08** - Test Suite (Verification)

---

## 🎉 Success Criteria

When all tasks are complete, you should have:

- ✅ **Secure** input validation and environment filtering
- ✅ **Stable** memory management (no leaks)
- ✅ **Consistent** error handling
- ✅ **Type-safe** TypeScript codebase
- ✅ **Efficient** metrics and event management
- ✅ **Tested** code with 80%+ coverage
- ✅ **Production-ready** codebase

---

## 📞 Questions?

- Review the detailed task file for each task in `docs/tasks/`
- Check `docs/TASKS_MASTER.md` for overall progress
- Review the code review report in the original conversation

---

**Created for:** AgentMaestro CLI Code Improvement Initiative
**Version:** 1.0
**Date:** 2025-11-17

**Let's make AgentMaestro production-ready! 🚀**
