#!/bin/bash

# Demo script to run Maestro with a simple prompt

echo "🎭 Running AgentMaestro Demo..."
echo ""
echo "Starting Maestro with Gemini as primary agent..."
echo "Sending prompt: 'Say hello and explain what you can do in one sentence'"
echo ""
echo "Press Ctrl+C to exit"
echo ""
echo "─────────────────────────────────────────────────"
echo ""

# Run maestro with gemini and pipe a simple prompt
echo "Say hello and explain what you can do in one sentence" | timeout 10 node src/index.js --agent gemini
