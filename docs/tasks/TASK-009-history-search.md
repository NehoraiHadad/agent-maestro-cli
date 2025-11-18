# TASK-009: History Search & Management

**Status**: 🔴 Not Started  
**Priority**: P2  
**Estimated Time**: 6 hours  
**Dependencies**: TASK-005  

---

## 📋 Description

Implement comprehensive history search, filtering, and export functionality.

## 🎯 Objectives

1. Full-text search in message history
2. Filtering by agent, date, type
3. Export to various formats (JSON, MD, TXT)
4. History statistics
5. Session commands for history

## 📝 Implementation

```typescript
// src/features/history/HistoryManager.ts
export class HistoryManager {
  search(query: string, options?: SearchOptions): Message[];
  filter(predicate: (msg: Message) => boolean): Message[];
  export(format: 'json' | 'md' | 'txt', options?: ExportOptions): string;
  getStats(): HistoryStats;
}
```

## 💡 Usage Examples

```bash
# In interactive mode
> /search "authentication"
> /history --last 10
> /history --agent claude
> /export markdown
```

## ✅ Acceptance Criteria

- [ ] Full-text search working
- [ ] Multiple filter options
- [ ] Export to JSON/Markdown/Text
- [ ] Session commands implemented
- [ ] Tests for search/filter
- [ ] Documentation

## 🔄 Post-Completion

Commit: "feat: add history search and management (TASK-009)"
