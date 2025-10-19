# Claude Dynamic Spinner Enhancement

## Problem Identified

The Claude spinner was showing static `"responding..."` status for most of the execution, while Codex had rich, dynamic status updates showing specific actions like:
- `executing: ls`
- `reading: package.json`
- `thinking: Let me analyze...`

### Root Cause

**ClaudeParser.ts** (src/features/streaming/parsers/ClaudeParser.ts:26-47):
```typescript
extractStatus(event: ClaudeStreamEvent): string | null {
  if (this.hasType(event, 'system')) {
    if (event.subtype === 'init') return 'initializing...';
  }

  if (this.hasType(event, 'assistant')) {
    if (this.exists(event.message)) return 'responding...';  // ← Always same status!
  }

  if (this.hasType(event, 'result')) return 'completed';
  return null;
}
```

Every assistant message → `"responding..."` → StatusUpdater skips duplicates → spinner frozen!

## Solution Implemented

### 1. Enhanced Type Definitions

Updated `ClaudeStreamEvent` interface (src/shared/types/streaming.types.ts) to match actual Claude CLI stream structure:

```typescript
export interface ClaudeStreamEvent extends BaseStreamEvent {
  subtype?: string;
  message?: {
    role?: string;
    content: string | Array<{
      type?: string;           // 'text' | 'tool_use' | 'tool_result'
      text?: string;           // Text content
      id?: string;             // Tool use ID
      name?: string;           // Tool name (e.g., 'Bash', 'Read')
      input?: Record<string, unknown>;  // Tool parameters
      tool_use_id?: string;    // Reference to tool use
      content?: string;        // Tool result content
      is_error?: boolean;      // Tool execution error flag
    }>;
  };
}
```

### 2. Dynamic Status Extraction

Implemented intelligent status extraction in ClaudeParser:

#### Text Blocks → Thinking Status
```typescript
if (block.type === 'text' && block.text) {
  return `thinking: ${truncate(block.text, 60)}`;
}
```
Example: `"thinking: I'll help you read the package.json file..."`

#### Tool Use Blocks → Specific Tool Actions

**Read Tool:**
```typescript
if (toolName === 'Read' && input?.file_path) {
  const filename = input.file_path.split('/').pop();
  return `reading: ${filename}`;
}
```
Example: `"reading: package.json"`

**Bash Commands:**
```typescript
if (toolName === 'Bash' && input?.command) {
  return this.formatBashCommand(input.command);
}
```
Examples:
- `git status` → `"git: status..."`
- `npm install` → `"npm: install..."`
- `grep pattern file` → `"searching files..."`
- `ls -la` → `"listing files..."`

**Search Operations:**
```typescript
if (toolName === 'Grep' && input?.pattern) {
  return `searching: ${truncate(input.pattern, 40)}`;
}
```
Example: `"searching: delegation"`

**File Operations:**
- Edit → `"editing: filename.ts"`
- Write → `"writing: filename.ts"`
- Glob → `"finding files: **/*.ts"`

**Agent Delegation:**
```typescript
if (toolName === 'Task' && input?.subagent_type) {
  return `delegating to ${input.subagent_type}...`;
}
```
Example: `"delegating to Explore..."`

#### Tool Results → Processing Status
```typescript
if (block.type === 'tool_result') {
  if (block.is_error) return 'tool execution failed';
  return 'processing tool result...';
}
```

### 3. Implementation Files Modified

1. **src/shared/types/streaming.types.ts**
   - Enhanced ClaudeStreamEvent interface with complete content block structure

2. **src/features/streaming/parsers/ClaudeParser.ts**
   - Added `extractAssistantStatus()` - handles text and tool_use blocks
   - Added `extractToolResultStatus()` - handles tool results
   - Added `formatToolUseStatus()` - maps tools to readable statuses
   - Added `formatBashCommand()` - extracts command type from bash strings
   - Imported `truncate` utility for text snippets

## Comparison: Before vs After

### Before
```
Claude: initializing...
Claude: responding...
Claude: responding...
Claude: responding...
Claude: responding...
Claude: completed
```

### After
```
Claude: initializing...
Claude: thinking: I'll help you read the package.json file...
Claude: reading: package.json
Claude: processing tool result...
Claude: thinking: Now I'll search for 'delegation' in TypeScript files...
Claude: searching: delegation
Claude: finding files: src/**/*.ts
Claude: processing tool result...
Claude: thinking: Here are the files containing 'delegation'...
Claude: completed
```

## Benefits

1. **User Visibility** - Users see exactly what Claude is doing in real-time
2. **Debugging** - Easier to identify when/where execution gets stuck
3. **Consistency** - Claude spinner now matches Codex's dynamic behavior
4. **Extensibility** - Easy to add new tool-specific status messages
5. **Robustness** - Gracefully handles unknown tools with generic `"using tool: {name}"`

## Testing

Build successful:
```bash
npm run build
# ✓ TypeScript compilation successful
```

The implementation is fully backward compatible - if Claude returns unexpected event structures, the parser falls back to generic statuses.

## Event Flow

1. **Claude CLI** streams JSONL events with `--output-format stream-json`
2. **PTYEventEmitter** receives raw data via `ptyProcess.onData()`
3. **Maestro** splits data into lines
4. **StreamProcessor** parses JSON into ClaudeStreamEvent
5. **ClaudeParser.extractStatus()** analyzes content blocks
6. **StatusUpdater** checks for changes and updates spinner
7. **Spinner** displays dynamic status to user

## Future Enhancements

Potential additions for even richer status updates:

1. **Progress Indicators** - Show file read progress for large files
2. **Delegation Depth** - `"delegating to Explore (depth 2)..."`
3. **Tool Duration** - `"reading: large-file.json (3.2s)"`
4. **Error Details** - `"tool failed: permission denied"`
5. **Parallel Tools** - `"running 3 tools in parallel..."`

## Notes

- The spinner update logic in StatusUpdater.ts:107-115 correctly skips duplicate statuses, so each unique status change will be displayed
- Claude CLI event structure may evolve - the implementation uses defensive checks with optional chaining
- Logging can be enhanced to track status transitions for debugging
