#!/bin/bash

echo "🧪 Testing Maestro with Prompt File"
echo "===================================="
echo ""

# Create a prompt file
cat > /tmp/test-prompt.txt << 'EOF'
What is 2 + 2? Answer with just the number.
EOF

echo "Prompt file created:"
cat /tmp/test-prompt.txt
echo ""
echo "===================================="
echo "Running Maestro with Gemini..."
echo "===================================="
echo ""

# Run with timeout and capture output
timeout 20 gemini -p "What is 2 + 2? Answer with just the number." 2>&1 | head -50

echo ""
echo "===================================="
echo "Direct Gemini test completed"
