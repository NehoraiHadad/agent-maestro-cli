# 📁 Refactoring Tasks Directory

> **Purpose:** Individual task files for architecture simplification
> **Status:** 5 tasks pending execution
> **Last Updated:** 2025-11-17

---

## 📋 Overview

This directory contains detailed task files for simplifying AgentMaestro's architecture. Each task is a self-contained document with complete instructions.

**Workflow:**
1. Agent reads task file
2. Agent executes all steps
3. Agent runs tests (must pass)
4. Agent **deletes task file** ✅
5. Agent updates `docs/REFACTORING_TASKS.md`

---

## 📂 Current Tasks

### ⚡ Phase 1: Parallel Execution (Can run simultaneously)

| Task | File | Status | Time |
|------|------|--------|------|
| 04 | `refactor-04-config-simplify.md` | 📋 Pending | 1-2h |
| 05 | `refactor-05-metrics-optional.md` | 📋 Pending | 2-3h |
| 06 | `refactor-06-session-simplify.md` | 📋 Pending | 2-3h |

**Run in parallel for maximum speed! ⚡**

### 🔄 Phase 2: Sequential Execution (Run after Phase 1)

| Task | File | Status | Time |
|------|------|--------|------|
| 07 | `refactor-07-merge-stream.md` | 📋 Pending | 2-3h |

### 📚 Phase 3: Documentation (Run last)

| Task | File | Status | Time |
|------|------|--------|------|
| 08 | `refactor-08-update-docs.md` | 📋 Pending | 1-2h |

---

## 🎯 Quick Start

### Execute Single Task

```bash
# Copy this prompt:
Read and execute docs/tasks/refactor-04-config-simplify.md. Follow all instructions exactly, run all tests, and when successfully completed, delete the task file and update docs/REFACTORING_TASKS.md to mark task 04 as completed with today's date.
```

### Execute All Tasks

See `docs/PROMPTS.md` for ready-to-use prompts.

---

## 📝 Task File Structure

Each task file follows this format:

```markdown
# 🔧 Refactor XX: Task Name

> **Priority:** HIGH/MEDIUM
> **Can Run in Parallel:** YES/NO
> **Estimated Time:** X hours
> **Status:** Pending

## 🎯 Objective
[What needs to be done and why]

## 📋 Current Problems
[What's wrong with current implementation]

## ✅ Implementation Steps
[Step-by-step instructions]

## 🧪 Testing Requirements
[How to verify the changes work]

## 📝 Files to Modify
[List of all files affected]

## ✅ Completion Checklist
[Checkbox list of all requirements]

## 🎯 Success Criteria
[How to know it's done correctly]

## 🚨 Important Notes
[Critical information and warnings]
```

---

## ✅ Completion Process

When a task is completed:

1. **Tests pass** ✓
   ```bash
   npm test
   # All 253 tests must pass
   ```

2. **Build succeeds** ✓
   ```bash
   npm run build
   # No TypeScript errors
   ```

3. **Commit changes** ✓
   ```bash
   git add .
   git commit -m "refactor: [description] (Refactor XX)"
   ```

4. **Delete task file** ✓
   ```bash
   rm docs/tasks/refactor-XX-*.md
   ```

5. **Update master** ✓
   - Edit `docs/REFACTORING_TASKS.md`
   - Mark task as ✅ Completed
   - Add completion date

---

## 🚫 Important Rules

**DO:**
- ✅ Read entire task file before starting
- ✅ Follow checklist exactly
- ✅ Run all tests before marking complete
- ✅ Delete task file only after success
- ✅ Update REFACTORING_TASKS.md
- ✅ Commit with proper message

**DON'T:**
- ❌ Skip any checklist items
- ❌ Delete task file if tests fail
- ❌ Modify files not mentioned in task
- ❌ Change functionality (only refactor)
- ❌ Commit without running tests

---

## 📊 Expected Results

After all tasks complete:

- **Code Reduction:** ~380 lines removed
- **Clarity:** Wrapper nature emphasized
- **Performance:** Metrics optional (off by default)
- **Simplicity:** Plain objects over classes
- **Tests:** All 253 passing ✓

---

## 🔍 Monitoring Progress

Check current status:
```bash
cat docs/REFACTORING_TASKS.md
```

See which tasks remain:
```bash
ls docs/tasks/refactor-*.md
```

Verify all tests:
```bash
npm test
```

---

## 🆘 If Something Goes Wrong

### Tests Fail
1. Read test output carefully
2. Check task file for missed steps
3. Review modified files
4. Don't delete task file
5. Fix issues and re-run tests

### Build Fails
1. Check TypeScript errors
2. Verify imports are correct
3. Check for typos in new files
4. Review task file steps again

### Unsure About Step
1. Re-read task file carefully
2. Check related code files
3. Look at similar existing code
4. Ask for clarification

---

## 📞 Support

- **Task Issues:** Check task file's "Important Notes" section
- **Test Failures:** Review task file's "Testing Requirements"
- **Questions:** Refer to `docs/REFACTORING_TASKS.md`

---

## 🎯 Success Metrics

Track your progress:

- [ ] Phase 1 complete (3 tasks in parallel)
- [ ] All tests passing
- [ ] Phase 2 complete (1 task)
- [ ] All tests still passing
- [ ] Phase 3 complete (documentation)
- [ ] All task files deleted
- [ ] REFACTORING_TASKS.md shows 100%
- [ ] Changes committed and pushed

---

**Happy refactoring! 🚀**

**Remember:** Delete task files only when completed successfully!
