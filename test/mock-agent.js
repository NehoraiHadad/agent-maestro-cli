#!/usr/bin/env node

/**
 * Mock agent for testing - simulates agent behavior
 */

const agentName = process.argv[2] || 'mock';

console.log(`[${agentName} Agent] Ready for input...`);

process.stdin.on('data', (data) => {
  const input = data.toString().trim();
  
  if (input.includes('delegate') || input.includes('use another agent')) {
    // Simulate delegation request
    console.log(`[${agentName} Agent] I'll delegate this task...`);
    console.log(`MAESTRO_DELEGATE::{"agent": "gemini", "prompt": "Help analyze this request: ${input}"}`);
  } else if (input.includes('hello') || input.includes('test')) {
    console.log(`[${agentName} Agent] Hello! I'm a mock agent for testing.`);
    console.log(`[${agentName} Agent] I received: "${input}"`);
  } else {
    console.log(`[${agentName} Agent] Processing: ${input}`);
    console.log(`[${agentName} Agent] Task completed successfully.`);
  }
});

setTimeout(() => {
  console.log(`[${agentName} Agent] Session timeout - exiting`);
  process.exit(0);
}, 5000);

