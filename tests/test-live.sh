#!/bin/bash

echo "🎭 Testing Maestro with Real Agent Response"
echo "=============================================="
echo ""
echo "Sending prompt to Gemini: 'Say hello in one sentence'"
echo ""
echo "Press Ctrl+C after response or wait 15 seconds..."
echo ""
echo "=============================================="
echo ""

# Send a simple prompt and capture output
(
  sleep 2
  echo "Say hello in one sentence"
  sleep 8
  echo ""
) | timeout 15 node src/index.js --agent gemini 2>&1 | tee /tmp/maestro-output.log

echo ""
echo "=============================================="
echo "Output saved to: /tmp/maestro-output.log"
echo ""
echo "Checking if we got a response..."
echo ""

if grep -q "Hello" /tmp/maestro-output.log; then
  echo "✅ SUCCESS: Got response from agent!"
else
  echo "⚠️  Checking output..."
fi

echo ""
echo "Last 20 lines of output:"
echo "---"
tail -20 /tmp/maestro-output.log
