# Interactive Testing Guide

## Test Each Agent

### Test Claude
```bash
node src/index.js --agent claude
```

Once in the CLI, try:
```
/test                                    # Test connection
Hello, can you help me?                  # Simple request
/agents                                  # List available agents
/logs                                    # View session logs
/exit                                    # Exit
```

### Test Gemini
```bash
node src/index.js --agent gemini
```

Try these commands:
```
/test
What is the difference between var and let in JavaScript?
/logs
/exit
```

### Test Codex
```bash
node src/index.js --agent codex
```

Try:
```
/test
Write a function to reverse a string in Python
/logs
/exit
```

## Expected Behavior

1. **Welcome Screen**: Shows primary agent and available commands
2. **Logging**: Each interaction is logged to `logs/session-YYYYMMDD-HHMMSS.log`
3. **Commands**:
   - `/help` - Shows help
   - `/agents` - Lists all agents
   - `/test` - Tests agent connection
   - `/logs` - Shows session summary
   - `/clear` - Clears screen
   - `/exit` - Exits with summary

4. **User Input**: Any non-command text is sent to the primary agent
5. **Agent Response**: Displayed with agent name prefix
6. **Error Handling**: Shows clear error messages

## Log Files

Check logs after session:
```bash
ls -la logs/
cat logs/session-*.log
```

## Troubleshooting

### Agent not responding
```bash
# Check if agent is installed
claude --version
gemini --version
codex --version

# Test agent directly
claude -p "test"
gemini -p "test"
codex -p "test"
```

### Connection timeout
- Increase timeout in `src/config.js`
- Check internet connection for cloud agents
- Verify API keys are configured

### Logs not saving
- Check `logs/` directory exists
- Verify write permissions
- Check disk space

