# 🚀 Quick Prompts for AgentMaestro Refactoring

> **Purpose:** Ready-to-use prompts for delegating refactoring tasks
> **Last Updated:** 2025-11-17

---

## 📋 How to Use

1. Copy the prompt for the task you want to execute
2. Paste it to an AI agent (Claude, etc.)
3. Agent will read the task file and execute it
4. Agent will delete the task file when done
5. Agent will update REFACTORING_TASKS.md

---

## ⚡ Phase 1: Parallel Execution

Run these **3 tasks in parallel** for maximum speed:

### Task 04: Simplify ConfigManager
```
Read and execute the task file at docs/tasks/refactor-04-config-simplify.md. Follow all instructions exactly, run all tests, and when successfully completed, delete the task file and update docs/REFACTORING_TASKS.md to mark task 04 as completed with today's date.
```

### Task 05: Make MetricsCollector Optional
```
Read and execute the task file at docs/tasks/refactor-05-metrics-optional.md. Follow all instructions exactly, run all tests, and when successfully completed, delete the task file and update docs/REFACTORING_TASKS.md to mark task 05 as completed with today's date.
```

### Task 06: Simplify SessionManager
```
Read and execute the task file at docs/tasks/refactor-06-session-simplify.md. Follow all instructions exactly, run all tests, and when successfully completed, delete the task file and update docs/REFACTORING_TASKS.md to mark task 06 as completed with today's date.
```

---

## 🔄 Phase 2: Sequential Execution

Run this task **after** Phase 1 is complete:

### Task 07: Merge Stream Processing
```
Read and execute the task file at docs/tasks/refactor-07-merge-stream.md. Follow all instructions exactly, run all tests, and when successfully completed, delete the task file and update docs/REFACTORING_TASKS.md to mark task 07 as completed with today's date.
```

---

## 📚 Phase 3: Documentation

Run this task **last** after all code changes:

### Task 08: Update Documentation
```
Read and execute the task file at docs/tasks/refactor-08-update-docs.md. Follow all instructions exactly, verify all markdown renders correctly, and when successfully completed, delete the task file and update docs/REFACTORING_TASKS.md to mark task 08 as completed with today's date.
```

---

## 🎯 Alternative: Single Comprehensive Prompt

If you want to execute all tasks in one go:

```
Execute the AgentMaestro refactoring initiative:

Phase 1 (Parallel):
1. Read and execute docs/tasks/refactor-04-config-simplify.md
2. Read and execute docs/tasks/refactor-05-metrics-optional.md
3. Read and execute docs/tasks/refactor-06-session-simplify.md

Wait for all Phase 1 tasks to complete and verify tests pass.

Phase 2 (Sequential):
4. Read and execute docs/tasks/refactor-07-merge-stream.md

Wait for Phase 2 to complete and verify tests pass.

Phase 3 (Documentation):
5. Read and execute docs/tasks/refactor-08-update-docs.md

After each task:
- Run npm test (all must pass)
- Run npm run build (must succeed)
- Delete the task file
- Update docs/REFACTORING_TASKS.md with completion status

Final step:
- Commit all changes with message: "refactor: Complete architecture simplification (Tasks 04-08)"
- Update docs/REFACTORING_TASKS.md to show 100% completion
```

---

## ✅ Verification Prompts

### Check Task Status
```
Read docs/REFACTORING_TASKS.md and show me the current progress and which tasks are remaining.
```

### Verify Tests
```
Run npm test and npm run build to verify all changes are working correctly. Report any failures.
```

### Show Changes Summary
```
Show me a git diff summary of all changes made during the refactoring tasks.
```

---

## 🔍 Debugging Prompts

If something goes wrong:

### Revert Last Task
```
I need to revert the last refactoring task. Show me the recent commits, and help me safely revert to the previous working state while preserving any manual changes I made.
```

### Fix Failing Tests
```
npm test is showing failures. Analyze the test output, identify the root cause, and fix the issues while maintaining the refactoring goals.
```

### Fix Build Errors
```
npm run build is failing with TypeScript errors. Analyze the errors, fix the type issues, and ensure the build succeeds while keeping the simplified architecture.
```

---

## 📊 Progress Tracking Prompts

### Daily Summary
```
Read docs/REFACTORING_TASKS.md and give me a daily summary: what's completed, what's in progress, and what's remaining. Include estimated time to completion.
```

### Generate Report
```
Create a detailed report of the refactoring initiative including:
- Tasks completed
- Lines of code changed (added/removed)
- Test coverage status
- Any issues encountered
- Recommendations for next steps
```

---

## 🚀 Advanced Usage

### Custom Task Order

If you want to run tasks in different order:

```
I want to execute refactoring tasks in this custom order: [list your order].
For each task:
1. Read the task file from docs/tasks/
2. Execute all steps
3. Run tests
4. Delete task file if successful
5. Update REFACTORING_TASKS.md

Stop if any task fails and report the issue.
```

### Partial Execution

Execute only specific tasks:

```
I only want to execute refactoring tasks [04, 05, 08]. Execute them in order, following all instructions in their respective task files, and update REFACTORING_TASKS.md accordingly.
```

---

## 📝 Notes for AI Agents

**Important Instructions:**

1. **Always read the task file first** - Don't guess the implementation
2. **Follow the checklist** - Every item must be completed
3. **Run tests** - All 253 tests must pass before marking done
4. **Delete task file** - Only after successful completion
5. **Update master** - Mark task as ✅ in REFACTORING_TASKS.md
6. **Commit changes** - Use the format specified in the task

**Don't:**
- ❌ Skip any steps
- ❌ Assume what needs to be done
- ❌ Delete task files if tests fail
- ❌ Modify code not mentioned in the task
- ❌ Skip the commit step

---

## 🎭 Example Workflow

**Human:**
```
Read and execute docs/tasks/refactor-04-config-simplify.md
```

**Agent:**
```
Reading task file...
✓ Understood requirements
✓ Creating src/shared/config/MaestroConfig.ts
✓ Updating Maestro.ts
✓ Updating StartCommand.ts
✓ Replacing all config.get() calls
✓ Updating tests
✓ Deleting ConfigManager.ts
✓ Running npm test... 253/253 passing ✓
✓ Running npm run build... Success ✓
✓ Deleting task file
✓ Updating REFACTORING_TASKS.md
✓ Committing changes

Task 04 completed successfully!
```

---

**Ready to simplify! 🎯**
