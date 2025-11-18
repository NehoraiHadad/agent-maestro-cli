# 📋 AgentMaestro Refactoring Tasks

This directory contains task files for the AgentMaestro refactoring project.

---

## 📁 Directory Structure

```
docs/tasks/
├── README.md                                  # This file - overview
├── STATUS.md                                  # Central status tracker
├── PROMPTS.md                                 # Ready-to-use agent prompts
├── TASK-001-remove-parsers.md                # Parser simplification
├── TASK-002-fix-ui-messages.md               # UI message fixes
├── TASK-003-remove-delegation-detection.md   # Delegation detection removal
├── TASK-004-simplify-agent-management.md     # Agent management simplification
├── TASK-005-remove-infrastructure.md         # Infrastructure removal
├── TASK-006-merge-small-files.md             # File merging
└── TASK-007-simplify-error-handling.md       # Error handling simplification
```

---

## 🎯 Purpose

This task system enables:
- **Organized execution**: Each task is a complete, self-contained specification
- **Parallel work**: Multiple agents can work on different tasks simultaneously
- **Progress tracking**: STATUS.md provides centralized progress visibility
- **Easy delegation**: PROMPTS.md contains ready-to-use prompts for agents
- **Clear documentation**: Each task file documents the problem, solution, and acceptance criteria

---

## 📊 Task Priority

### 🔴 Critical (Must Complete)
1. **TASK-001**: Remove/Simplify Parsers
2. **TASK-002**: Fix UI Messages
3. **TASK-003**: Remove Delegation Detection (depends on TASK-001)
4. **TASK-004**: Simplify Agent Management

### 🟡 Medium (Should Complete)
5. **TASK-005**: Remove Infrastructure
6. **TASK-006**: Merge Small Files
7. **TASK-007**: Simplify Error Handling

---

## 🚀 Quick Start

### Option 1: Single Task Execution

1. **Choose a task** from the list above
2. **Open** PROMPTS.md
3. **Copy** the prompt for your chosen task
4. **Send** to an AI agent (Claude, Codex, etc.)
5. **Monitor** progress in STATUS.md

### Option 2: Parallel Execution (Faster)

1. **Open** PROMPTS.md
2. **Use** the "Multi-Task Execution (Parallel)" prompt
3. **Execute** tasks 1,2,4,5,6,7 simultaneously
4. **Wait** for completion
5. **Then execute** TASK-003 (depends on TASK-001)

---

## 🔄 Workflow

### For Each Task:

1. **Before Starting**:
   - Check STATUS.md for dependencies
   - Read the complete task file
   - Understand the acceptance criteria

2. **During Execution**:
   - Follow steps sequentially
   - Test frequently (npm run build && npm run test)
   - Keep notes of any issues

3. **After Completion**:
   - Verify all acceptance criteria
   - Update STATUS.md
   - Delete the task file
   - Commit changes

---

## ✅ Success Criteria

The refactoring is complete when:
- [ ] All 7 tasks are marked ✅ Complete in STATUS.md
- [ ] All task files are deleted
- [ ] npm run build succeeds
- [ ] npm run test passes all tests
- [ ] Manual testing works correctly
- [ ] Code complexity reduced by ~50%

---

Happy refactoring! 🚀
