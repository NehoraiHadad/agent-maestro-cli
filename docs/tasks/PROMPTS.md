# 🤖 Agent Prompts for Task Execution

This file contains ready-to-use prompts for delegating tasks to AI agents.

---

## 📋 How to Use

1. **Choose a task** from the list below
2. **Copy the entire prompt** for that task
3. **Send to an AI agent** (Claude, Codex, etc.)
4. **Monitor progress** - the agent will read the task file, execute, and update STATUS.md
5. **Verify completion** - check that the task file is deleted and STATUS.md is updated

---

## 🔄 Task Execution Order

### ✅ Can Run in Parallel (Group A):
- TASK-001 (Parsers)
- TASK-002 (UI Messages)
- TASK-004 (Agent Management)
- TASK-005 (Infrastructure)
- TASK-006 (Merge Files)
- TASK-007 (Error Handling)

### ⏳ Must Run After (Group B):
- TASK-003 (Delegation Detection) - **Requires TASK-001 to be completed first**

---

## 🎯 Prompt Templates

---

### TASK-001: Remove/Simplify Parsers (CRITICAL)

```
Please execute TASK-001: Remove/Simplify Stream Parsers.

Instructions:
1. Read the complete task specification: docs/tasks/TASK-001-remove-parsers.md
2. Follow all implementation steps carefully
3. Verify all acceptance criteria are met
4. Run tests and build to ensure everything works
5. Update docs/tasks/STATUS.md:
   - Change TASK-001 status from ⏳ Pending to ✅ Complete
   - Add completion date to Change Log
   - Add any relevant notes
6. Delete the task file: docs/tasks/TASK-001-remove-parsers.md
7. Commit changes with message: "refactor: simplify stream parsers (TASK-001)"

Priority: CRITICAL
Estimated time: 2-3 hours
Dependencies: None
Can run in parallel: Yes

Please confirm you've read the task file and are ready to proceed.
```

---

### TASK-002: Fix UI Messages (CRITICAL)

```
Please execute TASK-002: Fix UI Messages.

Instructions:
1. Read the complete task specification: docs/tasks/TASK-002-fix-ui-messages.md
2. Follow all implementation steps carefully
3. Update all misleading "Auto-delegation" messages
4. Ensure all messages reflect maestro's role as a wrapper
5. Verify all acceptance criteria are met
6. Run tests and build to ensure everything works
7. Update docs/tasks/STATUS.md:
   - Change TASK-002 status from ⏳ Pending to ✅ Complete
   - Add completion date to Change Log
   - Add any relevant notes
8. Delete the task file: docs/tasks/TASK-002-fix-ui-messages.md
9. Commit changes with message: "fix: update UI messages to reflect wrapper role (TASK-002)"

Priority: CRITICAL
Estimated time: 1-2 hours
Dependencies: None
Can run in parallel: Yes

Please confirm you've read the task file and are ready to proceed.
```

---

### TASK-003: Remove Delegation Detection (CRITICAL - DEPENDS ON TASK-001)

```
⚠️ IMPORTANT: This task requires TASK-001 to be completed first!

Please execute TASK-003: Remove Delegation Detection.

Instructions:
1. Verify TASK-001 is completed (check docs/tasks/STATUS.md)
2. If TASK-001 is not complete, STOP and notify me
3. If TASK-001 is complete, read: docs/tasks/TASK-003-remove-delegation-detection.md
4. Follow all implementation steps carefully
5. Remove all delegation detection logic from maestro
6. Verify all acceptance criteria are met
7. Run tests and build to ensure everything works
8. Update docs/tasks/STATUS.md:
   - Change TASK-003 status from ⏳ Pending to ✅ Complete
   - Add completion date to Change Log
   - Add any relevant notes
9. Delete the task file: docs/tasks/TASK-003-remove-delegation-detection.md
10. Commit changes with message: "refactor: remove delegation detection logic (TASK-003)"

Priority: CRITICAL
Estimated time: 1-2 hours
Dependencies: TASK-001 must be completed first
Can run in parallel: No (wait for TASK-001)

Please confirm TASK-001 is complete and you've read the task file.
```

---

### TASK-004: Simplify Agent Management (CRITICAL)

```
Please execute TASK-004: Simplify Agent Management.

Instructions:
1. Read the complete task specification: docs/tasks/TASK-004-simplify-agent-management.md
2. Choose between Option A (recommended - Claude only) or Option B (keep all with docs)
3. Follow all implementation steps carefully for your chosen option
4. Update AgentRepository, commands, and related files
5. Verify all acceptance criteria are met
6. Run tests and build to ensure everything works
7. Update docs/tasks/STATUS.md:
   - Change TASK-004 status from ⏳ Pending to ✅ Complete
   - Add completion date to Change Log
   - Note which option was chosen (A or B)
8. Delete the task file: docs/tasks/TASK-004-simplify-agent-management.md
9. Commit changes with message: "refactor: simplify agent management (TASK-004, Option A/B)"

Priority: CRITICAL
Estimated time: 2-3 hours
Dependencies: None
Can run in parallel: Yes

Please confirm you've read the task file and which option you'll implement.
```

---

### TASK-005: Remove Infrastructure (MEDIUM)

```
Please execute TASK-005: Remove Unnecessary Infrastructure.

Instructions:
1. Read the complete task specification: docs/tasks/TASK-005-remove-infrastructure.md
2. Follow all implementation steps carefully
3. Remove CircuitBreaker, MetricsCollector, TimeoutManager, RetryManager
4. Update all files that use these components
5. Delete infrastructure files
6. Verify all acceptance criteria are met
7. Run tests and build to ensure everything works
8. Update docs/tasks/STATUS.md:
   - Change TASK-005 status from ⏳ Pending to ✅ Complete
   - Add completion date to Change Log
   - Note how many files/lines were removed
9. Delete the task file: docs/tasks/TASK-005-remove-infrastructure.md
10. Delete tests/unit/CircuitBreaker.test.ts if it exists
11. Commit changes with message: "refactor: remove unnecessary infrastructure (TASK-005)"

Priority: MEDIUM
Estimated time: 2-3 hours
Dependencies: None
Can run in parallel: Yes

Please confirm you've read the task file and are ready to proceed.
```

---

### TASK-006: Merge Small Files (MEDIUM)

```
Please execute TASK-006: Merge Small Files.

Instructions:
1. Read the complete task specification: docs/tasks/TASK-006-merge-small-files.md
2. Follow all implementation steps carefully
3. Create SessionInput.ts (merge InputValidator, PromptFormatter, KeypressHandler)
4. Create SessionOutput.ts (merge SessionDisplay, MessageProcessor)
5. Keep SessionCommands.ts separate
6. Update imports in InteractiveSession.ts and index.ts
7. Delete old files
8. Verify all acceptance criteria are met
9. Run tests and build to ensure everything works
10. Update docs/tasks/STATUS.md:
    - Change TASK-006 status from ⏳ Pending to ✅ Complete
    - Add completion date to Change Log
    - Note: 7 files → 4 files
11. Delete the task file: docs/tasks/TASK-006-merge-small-files.md
12. Commit changes with message: "refactor: merge small session files (TASK-006)"

Priority: MEDIUM
Estimated time: 2-3 hours
Dependencies: None
Can run in parallel: Yes

Please confirm you've read the task file and are ready to proceed.
```

---

### TASK-007: Simplify Error Handling (MEDIUM)

```
Please execute TASK-007: Simplify Error Handling.

Instructions:
1. Read the complete task specification: docs/tasks/TASK-007-simplify-error-handling.md
2. Follow all implementation steps carefully
3. Create MaestroError.ts and AgentError.ts
4. Update all files using old error classes
5. Delete old error files (AgentErrors, PTYErrors, OrchestrationErrors, ConfigErrors)
6. Update tests
7. Verify all acceptance criteria are met
8. Run tests and build to ensure everything works
9. Update docs/tasks/STATUS.md:
   - Change TASK-007 status from ⏳ Pending to ✅ Complete
   - Add completion date to Change Log
   - Note: 10+ error classes → 3 error classes
10. Delete the task file: docs/tasks/TASK-007-simplify-error-handling.md
11. Commit changes with message: "refactor: simplify error handling (TASK-007)"

Priority: MEDIUM
Estimated time: 2-3 hours
Dependencies: None
Can run in parallel: Yes

Please confirm you've read the task file and are ready to proceed.
```

---

## 🎯 Multi-Task Execution (Parallel)

If you want to execute **multiple tasks in parallel**, use this prompt:

```
Please execute the following tasks IN PARALLEL:
- TASK-001 (Parsers)
- TASK-002 (UI Messages)
- TASK-004 (Agent Management)
- TASK-005 (Infrastructure)
- TASK-006 (Merge Files)
- TASK-007 (Error Handling)

Instructions:
1. For each task, read the corresponding file in docs/tasks/
2. Execute all tasks simultaneously (they don't conflict)
3. Follow all implementation steps for each task
4. Verify all acceptance criteria are met for each task
5. Run tests and build after all tasks are complete
6. Update docs/tasks/STATUS.md:
   - Mark all tasks as ✅ Complete
   - Add completion dates to Change Log
   - Add any relevant notes
7. Delete all completed task files
8. Commit all changes with message: "refactor: complete critical and medium tasks (TASK-001,002,004,005,006,007)"

IMPORTANT: TASK-003 cannot run in parallel - it depends on TASK-001 being completed first.

Please confirm you've read all task files and are ready to proceed with parallel execution.
```

---

## ⚠️ Important Notes

### Before Starting:
- [ ] Check docs/tasks/STATUS.md for current state
- [ ] Verify task dependencies (especially TASK-003)
- [ ] Read the complete task file before starting
- [ ] Have a rollback plan ready

### During Execution:
- [ ] Follow ALL steps in the task file
- [ ] Run tests frequently (after major changes)
- [ ] Check for broken imports/references
- [ ] Verify acceptance criteria as you go

### After Completion:
- [ ] Run full test suite: `npm run test`
- [ ] Build the project: `npm run build`
- [ ] Manual test: `node dist/cli/index.js`
- [ ] Update STATUS.md
- [ ] Delete task file
- [ ] Commit with proper message

### If Something Goes Wrong:
- [ ] Use the rollback plan in the task file
- [ ] Check git status: `git status`
- [ ] Restore files: `git checkout HEAD -- <file>`
- [ ] Report the issue with details

---

## 📊 Progress Tracking

Check `docs/tasks/STATUS.md` for current progress:
- Overall progress
- Task completion status
- Change log
- Metrics (before/after)

---

## 🎓 Tips for Success

1. **Read Carefully**: Each task file has detailed instructions and code examples
2. **Test Often**: Don't wait until the end to test - test after each major change
3. **Use Rollback**: If stuck, use the rollback plan and start over
4. **Check Dependencies**: TASK-003 needs TASK-001 first
5. **Parallel is Fast**: Tasks 1,2,4,5,6,7 can all run in parallel
6. **Update STATUS**: Always update STATUS.md after completion
7. **Clean Commits**: Use the commit messages provided in each task

---

Good luck! 🚀
