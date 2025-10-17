#!/bin/bash

echo "🎭 Testing Maestro with Codex"
echo "=============================="
echo ""
echo "This test will start Maestro with Codex"
echo "We're checking if it starts without the 'cursor position' error"
echo ""
echo "=============================="
echo ""

# Just start Codex and wait a few seconds
timeout 10 node src/index.js --agent codex 2>&1

EXIT_CODE=$?

echo ""
echo "=============================="
echo "Exit code: $EXIT_CODE"

if [ $EXIT_CODE -eq 124 ]; then
  echo "Status: TIMEOUT (expected - we killed it after 10 seconds)"
  echo "Result: ✅ SUCCESS if no 'cursor position' error appeared above"
elif [ $EXIT_CODE -eq 1 ]; then
  echo "Status: ERROR"
  echo "Result: ❌ FAILED - check errors above"
else
  echo "Status: Clean exit"
  echo "Result: ✅ SUCCESS"
fi

echo "=============================="
