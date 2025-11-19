# History Search & Management

AgentMaestro provides comprehensive conversation history management with powerful search, filtering, and export capabilities.

## Features

- **Full-text Search**: Search across all messages in your conversation
- **Advanced Filtering**: Filter by agent, date range, message type
- **Multiple Export Formats**: Export to JSON, Markdown, or plain text
- **Statistics**: Get insights about your conversation history
- **Context Display**: View surrounding messages for search results

---

## Session Commands

### Search History

Search for specific content in your conversation:

```bash
/search "authentication"
/search "error handling"
/search "JWT token"
```

**Features:**
- Case-insensitive by default
- Shows matching messages with context
- Displays timestamps and agent information
- Shows surrounding messages for better understanding

### View History

Display conversation history with optional filters:

```bash
# Show all messages
/history

# Show last 10 messages
/history --last 10

# Show only messages from Claude
/history --agent claude

# Show only user messages
/history --role user
```

**Filter Options:**
- `--last N`: Show only the last N messages
- `--agent NAME`: Filter by agent name (e.g., claude)
- `--role ROLE`: Filter by role (user, assistant, delegation, system)

### Export History

Export your conversation to various formats:

```bash
# Export to JSON (default)
/export json

# Export to Markdown
/export markdown
/export md

# Export to plain text
/export text
/export txt
```

**Export Location:**
- Exports are saved to `~/.maestro/exports/`
- Filename format: `conversation-{sessionId}-{date}.{ext}`

**Export Content:**
- All conversation messages
- Timestamps
- Message metadata
- Agent information
- Conversation statistics

---

## Programmatic Usage

### HistoryManager API

The `HistoryManager` class provides programmatic access to history features:

```typescript
import { HistoryManager } from 'agent-maestro/features/history';
import { Message } from 'agent-maestro/domain/entities';

// Create a history manager with messages
const messages: Message[] = [...]; // Your messages
const historyManager = new HistoryManager(messages);
```

### Search

Perform full-text search with advanced options:

```typescript
// Simple search
const results = historyManager.search('authentication');

// Search with options
const results = historyManager.search('JWT', {
  caseSensitive: false,
  roles: ['user', 'assistant'],
  agents: ['claude'],
  fromDate: new Date('2025-01-01'),
  toDate: new Date('2025-12-31'),
  limit: 10,
  includeContext: true,
  contextSize: 2
});

// With context
const resultsWithContext = historyManager.search('error', {
  includeContext: true,
  contextSize: 2  // 2 messages before and after
}) as SearchResult[];

for (const result of resultsWithContext) {
  console.log('Before:', result.before);
  console.log('Match:', result.message);
  console.log('After:', result.after);
}
```

**Search Options:**
- `caseSensitive`: Enable case-sensitive search
- `roles`: Filter by message roles
- `agents`: Filter by agent names
- `fromDate`: Start date for filtering
- `toDate`: End date for filtering
- `limit`: Maximum number of results
- `includeContext`: Include surrounding messages
- `contextSize`: Number of messages before/after

### Filter

Filter messages using predicates or options:

```typescript
// Filter with predicate function
const longMessages = historyManager.filter(
  msg => msg.content.length > 100
);

// Filter with options
const claudeMessages = historyManager.filter({
  agents: ['claude'],
  roles: ['assistant'],
  fromDate: new Date('2025-01-01'),
  limit: 20
});

// Combine filters
const filtered = historyManager.filter({
  roles: ['user'],
  predicate: msg => msg.content.includes('error'),
  limit: 10
});
```

**Filter Options:**
- `agents`: Filter by agent name(s)
- `roles`: Filter by message role(s)
- `fromDate`: Filter from this date
- `toDate`: Filter until this date
- `predicate`: Custom filter function
- `limit`: Maximum number of results

### Export

Export conversation history to different formats:

```typescript
// Export to JSON
const json = historyManager.export('json', {
  includeMetadata: true,
  prettyPrint: true,
  includeStats: true
});

// Export to Markdown
const markdown = historyManager.export('md', {
  includeMetadata: true,
  includeTimestamps: true,
  includeStats: true
});

// Export to text
const text = historyManager.export('txt', {
  includeTimestamps: true,
  includeStats: true
});

// Export with filters
const filtered = historyManager.export('json', {
  filter: {
    roles: ['user', 'assistant'],
    agents: ['claude']
  }
});
```

**Export Options:**
- `includeMetadata`: Include message metadata
- `includeTimestamps`: Include timestamps
- `prettyPrint`: Pretty print JSON (JSON only)
- `includeStats`: Include conversation statistics
- `filter`: Apply filters before export

### Statistics

Get comprehensive statistics about your conversation:

```typescript
const stats = historyManager.getStats();

console.log('Total Messages:', stats.totalMessages);
console.log('User Messages:', stats.userMessages);
console.log('Assistant Messages:', stats.assistantMessages);
console.log('Delegation Messages:', stats.delegationMessages);
console.log('Average Message Length:', stats.averageMessageLength);
console.log('Messages by Agent:', stats.messagesByAgent);
console.log('First Message:', stats.firstMessage);
console.log('Last Message:', stats.lastMessage);
console.log('Duration:', stats.conversationDuration);
```

**Statistics Include:**
- Total message count by type
- Messages per agent
- Average message length
- First and last message timestamps
- Total conversation duration

---

## Export Formats

### JSON Format

Structured data format with full message details:

```json
{
  "messages": [
    {
      "id": "msg_123",
      "role": "user",
      "content": "Hello, world!",
      "metadata": {
        "agent": "claude",
        "timestamp": "2025-01-15T10:00:00.000Z"
      },
      "timestamp": "2025-01-15T10:00:00.000Z"
    }
  ],
  "stats": {
    "totalMessages": 10,
    "userMessages": 5,
    "assistantMessages": 5
  }
}
```

### Markdown Format

Human-readable format with formatting:

```markdown
# Conversation History

## Statistics

- **Total Messages:** 10
- **User Messages:** 5
- **Assistant Messages:** 5
- **Duration:** 5m 30s

---

## Messages

### User - 1/15/2025, 10:00:00 AM

Hello, I need help with authentication

### Assistant (claude) - 1/15/2025, 10:00:05 AM

I can help you with authentication...
```

### Text Format

Simple plain text format:

```
============================================================
Conversation History
============================================================

STATISTICS:
------------------------------------------------------------
Total Messages: 10
User Messages: 5
Assistant Messages: 5
Duration: 5m 30s

============================================================

[1] User - 1/15/2025, 10:00:00 AM
------------------------------------------------------------
Hello, I need help with authentication

[2] Assistant (claude) - 1/15/2025, 10:00:05 AM
------------------------------------------------------------
I can help you with authentication...
```

---

## Use Cases

### Debugging Conversations

Search for error messages and view context:

```bash
/search "error"
/search "failed"
/search "exception"
```

### Code Review

Find specific topics discussed:

```bash
/search "authentication"
/search "database"
/search "API endpoint"
```

### Documentation

Export conversations for documentation:

```bash
/export markdown
# Then include the exported file in your docs
```

### Analysis

Get statistics about your development session:

```typescript
const stats = historyManager.getStats();
console.log(`You had ${stats.totalMessages} messages in this session`);
console.log(`Average message length: ${stats.averageMessageLength} characters`);
```

### Filtering Specific Conversations

Review only Claude's responses:

```bash
/history --agent claude --role assistant
```

Review recent user questions:

```bash
/history --role user --last 5
```

---

## Best Practices

1. **Regular Exports**: Export important conversations for future reference
   ```bash
   /export markdown
   ```

2. **Search Before Asking**: Search history before asking repeated questions
   ```bash
   /search "how to implement"
   ```

3. **Filter for Focus**: Use filters to focus on specific parts of the conversation
   ```bash
   /history --last 20 --agent claude
   ```

4. **Review Statistics**: Check conversation stats to understand your session
   ```typescript
   const stats = historyManager.getStats();
   ```

5. **Use Context**: Enable context in searches for better understanding
   ```typescript
   historyManager.search('error', { includeContext: true, contextSize: 2 });
   ```

---

## Integration

### With Session Persistence

History features integrate seamlessly with session persistence:

```typescript
// Save session
const sessionManager = maestro.sessionManager;
const persistence = new SessionPersistence(storage);
await persistence.save(sessionManager.export());

// Load and analyze
const saved = await persistence.load(sessionId);
const historyManager = new HistoryManager(saved.data.messages.map(m => new Message(...)));
const stats = historyManager.getStats();
```

### With Middleware

Use history with middleware for advanced analytics:

```typescript
import { HistoryManager } from 'agent-maestro/features/history';
import { AnalyticsMiddleware } from 'agent-maestro/features/middleware';

// Track message patterns
const analytics = new AnalyticsMiddleware();
maestro.use(analytics);

// Later, analyze history
const historyManager = new HistoryManager(sessionManager.getMessages());
const stats = historyManager.getStats();
```

---

## API Reference

### HistoryManager

Main class for history management.

**Constructor:**
```typescript
new HistoryManager(messages: Message[])
```

**Methods:**
- `search(query: string, options?: SearchOptions): Message[] | SearchResult[]`
- `filter(predicateOrOptions: Function | FilterOptions): Message[]`
- `export(format: 'json' | 'md' | 'txt', options?: ExportOptions): string`
- `getStats(): HistoryStats`

### Types

**SearchOptions:**
```typescript
interface SearchOptions {
  caseSensitive?: boolean;
  roles?: MessageRole[];
  agents?: string[];
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  includeContext?: boolean;
  contextSize?: number;
}
```

**FilterOptions:**
```typescript
interface FilterOptions {
  agents?: string[];
  roles?: MessageRole[];
  fromDate?: Date;
  toDate?: Date;
  predicate?: (msg: Message) => boolean;
  limit?: number;
}
```

**ExportOptions:**
```typescript
interface ExportOptions {
  includeMetadata?: boolean;
  includeTimestamps?: boolean;
  filter?: FilterOptions;
  prettyPrint?: boolean;
  includeStats?: boolean;
}
```

**HistoryStats:**
```typescript
interface HistoryStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  delegationMessages: number;
  systemMessages: number;
  messagesByAgent: Record<string, number>;
  averageMessageLength: number;
  firstMessage?: Date;
  lastMessage?: Date;
  conversationDuration?: number;
}
```

---

## Examples

### Example 1: Finding Authentication Code

```typescript
const historyManager = new HistoryManager(messages);

// Search for authentication-related messages
const authMessages = historyManager.search('authentication', {
  includeContext: true,
  contextSize: 1
});

// Export to markdown for documentation
const markdown = historyManager.export('md', {
  filter: {
    predicate: msg => msg.content.includes('authentication')
  }
});
```

### Example 2: Analyzing Error Messages

```bash
# In interactive mode
/search "error"
/search "failed"
/search "exception"

# Export for analysis
/export json
```

### Example 3: Session Summary

```typescript
const stats = historyManager.getStats();

console.log(`
Session Summary:
- Total Messages: ${stats.totalMessages}
- Duration: ${Math.floor(stats.conversationDuration! / 60000)} minutes
- Avg Message Length: ${stats.averageMessageLength} chars
- Most Active Agent: ${Object.entries(stats.messagesByAgent)
    .sort((a, b) => b[1] - a[1])[0]?.[0]}
`);
```

---

## Troubleshooting

### Search Returns Too Many Results

Use more specific queries and filters:

```typescript
historyManager.search('specific term', {
  limit: 10,
  roles: ['assistant']
});
```

### Export File Not Found

Check the exports directory:

```bash
ls ~/.maestro/exports/
```

### Empty Search Results

Try case-insensitive search:

```typescript
historyManager.search('QUERY', {
  caseSensitive: false
});
```

---

## See Also

- [Session Persistence](../README.md#session-persistence)
- [Configuration](../README.md#configuration)
- [Middleware System](./MIDDLEWARE.md)
