#!/bin/bash

echo "🎭 Testing Maestro Interactive Mode"
echo "===================================="
echo ""
echo "This test will:"
echo "1. Start Maestro with Gemini"
echo "2. Wait 5 seconds for initialization"
echo "3. Send a simple prompt"
echo "4. Wait 5 seconds for response"
echo "5. Exit"
echo ""
echo "===================================="
echo ""

# Create a test that sends input after initialization
(
  # Wait for Gemini to initialize
  sleep 5

  # Send a simple prompt
  echo "What is the capital of France? One word answer."

  # Wait for response
  sleep 10

  # Send Ctrl+C to exit
  echo ""
) | timeout 20 node src/index.js --agent gemini 2>&1

echo ""
echo "===================================="
echo "Test completed"
echo "===================================="
