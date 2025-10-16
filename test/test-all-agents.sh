#!/bin/bash

# Test script for all three agents with various commands
echo "🧪 Testing Agent Maestro with all agents"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test each agent
for agent in claude gemini codex; do
    echo -e "${YELLOW}Testing $agent agent...${NC}"
    
    # Check if agent is installed
    if command -v $agent &> /dev/null; then
        echo -e "${GREEN}✓ $agent is installed${NC}"
        
        # Test basic command
        echo "  Testing: $agent --version"
        $agent --version 2>/dev/null || echo "  (version command not available)"
        
        # Test help
        echo "  Testing: $agent --help"
        $agent --help 2>/dev/null | head -5 || echo "  (help command not available)"
        
        echo ""
    else
        echo -e "${RED}✗ $agent is NOT installed${NC}"
        echo "  Install with: npm install -g @anthropic-ai/claude-code (for claude)"
        echo "                npm install -g @google/gemini-cli (for gemini)"
        echo "                npm install -g @openai/codex (for codex)"
        echo ""
    fi
done

echo "=========================================="
echo ""
echo "📝 Testing Maestro CLI..."
echo ""

# Test Maestro help
echo "Maestro help:"
node src/index.js --help

echo ""
echo "Maestro without args:"
node src/index.js

echo ""
echo "✅ Test complete!"

