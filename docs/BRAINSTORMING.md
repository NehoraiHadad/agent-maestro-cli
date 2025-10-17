# Brainstorming & Multi-Agent Conversations

## Current Implementation (MVP)

### How Results are Returned

In the current implementation:

1. **User** → **Primary Agent** (e.g., Claude)
2. **Primary Agent** → emits `MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "task"}`
3. **Maestro** intercepts, spawns **Secondary Agent** (Gemini)
4. **Secondary Agent** completes task and exits
5. **Maestro** captures full output
6. **Maestro** formats result and writes to **Primary Agent's stdin**
7. **Primary Agent** receives result and continues

### Result Format

```
[MAESTRO_RESULT]
Agent: Gemini CLI
============================================================
<Full output from Gemini>
============================================================
```

### Limitations

- **One-way communication**: Secondary → Primary only
- **No multi-turn**: Secondary agent exits after response
- **No direct conversation**: Agents can't talk to each other directly

---

## Future Enhancement: Brainstorming Mode

### Concept

Enable multiple agents to have a **group chat** style conversation to solve a problem collaboratively.

### Use Case Example

```
User: "Brainstorm the best architecture for a real-time chat app.
       I want Claude, Gemini, and Codex to discuss this together."
```

**Expected Flow:**
```
Maestro (Moderator)
├─ Claude: "I suggest microservices with WebSocket..."
│  └─ Gemini: "Good idea, but consider serverless..."
│     └─ Codex: "Here's a code example with Socket.io..."
│        └─ Claude: "Let me refactor that for better structure..."
└─ [Synthesis by Moderator]
```

---

## Proposed Architectures

### Option 1: Group Chat Pattern (Recommended)

Similar to **AutoGen's GroupChat** or **CrewAI's Crew**:

```javascript
// New brainstorm command
MAESTRO_BRAINSTORM::{
  "agents": ["claude", "gemini", "codex"],
  "topic": "Best architecture for real-time chat app",
  "rounds": 3,
  "moderator": "claude"
}
```

**Implementation:**

1. **Start Brainstorm Session**
   - Spawn all agents as persistent processes
   - Maintain conversation history

2. **Round-Robin Turns**
   ```
   Round 1: Claude → Gemini → Codex
   Round 2: Claude → Gemini → Codex
   Round 3: Claude → Gemini → Codex
   ```

3. **Context Sharing**
   - Each agent receives full conversation history
   - Format: "Previous messages: [Agent1] said X, [Agent2] said Y..."

4. **Synthesis**
   - Moderator (primary agent) summarizes
   - Returns final recommendation to user

### Option 2: Parallel Discussion

All agents respond simultaneously to the same question:

```javascript
MAESTRO_PARALLEL_DISCUSS::{
  "agents": ["claude", "gemini", "codex"],
  "question": "How to implement authentication?"
}
```

**Flow:**
```
Question → [Claude, Gemini, Codex] (parallel)
        ↓
   [Collect all responses]
        ↓
   Compare & Synthesize
        ↓
   Present to user
```

### Option 3: Debate Mode

Two agents argue different perspectives:

```javascript
MAESTRO_DEBATE::{
  "agents": ["claude", "gemini"],
  "topic": "SQL vs NoSQL for this project",
  "rounds": 3
}
```

**Flow:**
```
Claude: Pro SQL
Gemini: Pro NoSQL
Claude: Counter-argument
Gemini: Counter-argument
Moderator: Decision
```

---

## Implementation Details

### Persistent Agent Processes

Unlike current MVP (spawn → task → kill), brainstorming needs:

```javascript
class BrainstormSession {
  constructor(agentNames) {
    this.agents = {};
    // Spawn all agents and keep them alive
    agentNames.forEach(name => {
      this.agents[name] = this.spawnPersistent(name);
    });
  }

  async sendToAgent(agentName, message, context) {
    const prompt = this.formatPromptWithContext(message, context);
    this.agents[agentName].write(prompt);
    return this.waitForResponse(agentName);
  }

  formatPromptWithContext(message, context) {
    return `
Conversation so far:
${context.map(msg => `[${msg.agent}]: ${msg.content}`).join('\n')}

Your turn: ${message}
`;
  }
}
```

### Conversation History

```javascript
const conversation = [
  { agent: 'claude', content: 'I suggest microservices...', turn: 1 },
  { agent: 'gemini', content: 'Consider serverless...', turn: 1 },
  { agent: 'codex', content: 'Here is code...', turn: 1 }
];
```

### Turn Management

```javascript
async function runBrainstormRound(session, agents, topic, round) {
  const responses = [];

  for (const agent of agents) {
    const context = buildContext(responses, round);
    const response = await session.sendToAgent(
      agent,
      `${topic}. Please share your thoughts (round ${round})`,
      context
    );
    responses.push({ agent, content: response });
  }

  return responses;
}
```

---

## New CLI Commands

### Start Brainstorm Session

```bash
maestro brainstorm \
  --agents "claude,gemini,codex" \
  --topic "Best architecture for real-time chat" \
  --rounds 3
```

### Interactive Brainstorm

```bash
maestro --agent claude

> /brainstorm gemini,codex
Entered brainstorm mode with: gemini, codex
Your question: What is the best way to handle auth?

[Claude]: I recommend JWT with refresh tokens...
[Gemini]: Consider OAuth2 for third-party...
[Codex]: Here's implementation code...
```

---

## Challenges & Solutions

### Challenge 1: Context Window Limits

**Problem:** Long conversations exceed context limits

**Solutions:**
1. Summarize previous turns
2. Keep only last N messages
3. Use sliding window

### Challenge 2: Agent Interruption

**Problem:** How to prevent agents from monopolizing

**Solutions:**
1. Token limits per turn (e.g., 500 tokens max)
2. Time limits per response (e.g., 30 seconds)
3. Moderator can interrupt

### Challenge 3: Convergence

**Problem:** Agents keep disagreeing

**Solutions:**
1. Fixed number of rounds
2. Similarity check (if responses converge, stop early)
3. User can manually stop

### Challenge 4: Response Extraction

**Problem:** Parsing agent output from PTY

**Solutions:**
1. Use special markers: `[RESPONSE_START]...[RESPONSE_END]`
2. JSON mode if agents support it
3. Timeout and take whatever is available

---

## Phased Implementation

### Phase 1: Basic Round-Robin (Next Version)

- Simple turn-based conversation
- Fixed number of rounds
- Manual synthesis by user

### Phase 2: Smart Moderation

- Auto-synthesis by moderator agent
- Dynamic turn allocation
- Convergence detection

### Phase 3: Advanced Features

- Debate mode
- Parallel discussion
- Sub-topic branching
- Visual conversation tree

---

## Configuration Example

```javascript
// ~/.maestro/brainstorm-config.json
{
  "defaultAgents": ["claude", "gemini"],
  "defaultRounds": 3,
  "maxTurnLength": 500,
  "turnTimeout": 30000,
  "contextWindow": 10,
  "synthesisMode": "auto",
  "moderator": "claude"
}
```

---

## API Example (Future SDK)

```javascript
import { MaestroBrainstorm } from 'agent-maestro';

const session = new MaestroBrainstorm({
  agents: ['claude', 'gemini', 'codex'],
  topic: 'Best architecture for chat app',
  rounds: 3
});

const conversation = await session.run();

console.log('Final Summary:', conversation.synthesis);
```

---

## Real-World Example

### Scenario: API Design Discussion

```bash
$ maestro brainstorm --agents "claude,gemini" --rounds 2 --topic "REST vs GraphQL for mobile app API"

🎭 Brainstorm Session Started
Topic: REST vs GraphQL for mobile app API
Participants: Claude Code, Gemini CLI
Rounds: 2

────────────────────────────────────────────────
Round 1
────────────────────────────────────────────────

[Claude Code]:
"I recommend REST for this mobile app because..."
(2 minutes response)

[Gemini CLI]:
"While REST is solid, GraphQL offers better flexibility..."
(3 minutes response)

────────────────────────────────────────────────
Round 2
────────────────────────────────────────────────

[Claude Code]:
"Good points about GraphQL. However, consider..."
(2 minutes response)

[Gemini CLI]:
"Agreed. Perhaps a hybrid approach..."
(2 minutes response)

────────────────────────────────────────────────
Synthesis
────────────────────────────────────────────────

🎭 [Moderator - Claude Code]:
"Based on our discussion, here's my recommendation:
- Use REST for simple CRUD operations
- Use GraphQL for complex queries
- Consider BFF (Backend for Frontend) pattern..."

✓ Brainstorm session complete!
```

---

## Technical Requirements

### New Core Components

1. **BrainstormManager** (`src/core/brainstorm-manager.js`)
   - Manages multi-turn conversations
   - Context building
   - Turn allocation

2. **ConversationHistory** (`src/core/conversation-history.js`)
   - Stores messages
   - Provides context window
   - Summarization

3. **TurnController** (`src/core/turn-controller.js`)
   - Enforces time/token limits
   - Manages turn order
   - Detects convergence

### Modified Components

1. **PTYManager**
   - Support persistent processes
   - Better response extraction

2. **Maestro Core**
   - New brainstorm mode
   - Session management

---

## Summary

**Current State (MVP):**
- ✅ One-way delegation (Primary → Secondary → Primary)
- ✅ Simple, reliable
- ❌ No multi-agent conversations

**Future (Brainstorming Mode):**
- 🎯 Multi-agent group chat
- 🎯 Round-robin discussions
- 🎯 Automatic synthesis
- 🎯 Persistent sessions

**Benefits of Brainstorming:**
- 🌟 Diverse perspectives
- 🌟 Better solutions through collaboration
- 🌟 Creative problem-solving
- 🌟 Exposes different agent strengths
