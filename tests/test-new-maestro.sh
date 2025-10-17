#!/bin/bash

echo "🎭 Testing New Maestro CLI"
echo "=========================="
echo ""
echo "This will test the new message-based Maestro"
echo "We'll send it a simple message and see the response"
echo ""
echo "=========================="
echo ""

# Send a message via echo and pipe
(
  sleep 2
  echo "What is 5 + 5? Answer with just the number and nothing else."
  sleep 5
  echo "/exit"
) | timeout 15 node src/index.js --agent gemini 2>&1

EXIT_CODE=$?

echo ""
echo "=========================="
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Test completed successfully!"
elif [ $EXIT_CODE -eq 124 ]; then
  echo "⚠️  Timeout - check if it's stuck"
else
  echo "❌ Test failed with exit code: $EXIT_CODE"
fi
echo "=========================="
