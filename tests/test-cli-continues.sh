#!/bin/bash

echo "🎭 Testing Maestro CLI Continuation"
echo "===================================="
echo ""
echo "This test will:"
echo "1. Send first message and wait for response"
echo "2. Send second message to verify CLI continues"
echo "3. Check that Maestro doesn't exit"
echo ""
echo "===================================="
echo ""

# Send two messages in sequence
(
  sleep 3
  echo "What is 2 + 2? Just the number."
  sleep 10
  echo "What is 3 + 3? Just the number."
  sleep 10
  echo "/exit"
) | timeout 30 node src/index.js --agent gemini 2>&1 | tee /tmp/cli-test.log

EXIT_CODE=$?

echo ""
echo "===================================="
echo "Checking results..."
echo ""

# Count how many times we see [Maestro] prompt
PROMPT_COUNT=$(grep -c "\[Maestro\]" /tmp/cli-test.log)
echo "Number of prompts shown: $PROMPT_COUNT"

# Check for both answers
if grep -q "4" /tmp/cli-test.log && grep -q "6" /tmp/cli-test.log; then
  echo "✅ Both answers received!"
  echo "✅ CLI continued after first response"
else
  echo "❌ Not all answers received"
  echo "Check /tmp/cli-test.log for details"
fi

echo ""
echo "Exit code: $EXIT_CODE"
echo "===================================="
