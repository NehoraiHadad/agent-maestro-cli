#!/bin/bash

# Mock agent CLI for testing Maestro
# Simulates agent behavior

AGENT_NAME="${1:-mock}"

# Handle -p flag for prompt
if [ "$1" = "-p" ]; then
    PROMPT="$2"
    echo "[$AGENT_NAME Agent] Processing: $PROMPT"
    echo "[$AGENT_NAME Agent] This is a simulated response."
    echo "[$AGENT_NAME Agent] In a real scenario, I would analyze and respond appropriately."
    exit 0
fi

# Interactive mode
echo "[$AGENT_NAME Agent] Ready (type 'exit' to quit)"
while read -r line; do
    if [ "$line" = "exit" ]; then
        exit 0
    fi
    echo "[$AGENT_NAME Agent] Response to: $line"
done

