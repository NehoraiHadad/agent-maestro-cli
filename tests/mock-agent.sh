#!/bin/bash
# Mock agent for testing - simulates a simple AI CLI

echo "Mock Agent Started"
echo "Ready to receive commands..."

# Read from stdin
while IFS= read -r line; do
    # Simple responses based on input
    if [[ "$line" == *"hello"* ]]; then
        echo "Hello! I'm a mock agent."
    elif [[ "$line" == *"MAESTRO_DELEGATE"* ]]; then
        echo "I received a delegation request!"
        echo "Delegation parsing successful."
    else
        echo "Processing: $line"
        echo "Mock response to: $line"
    fi

    # Exit after first response for simplicity
    break
done

echo "Mock Agent Exiting"
exit 0
