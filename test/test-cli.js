#!/usr/bin/env node

/**
 * Test the new CLI interface with mock agents
 */

import { MaestroCLI } from '../src/core/maestro-cli.js';

// Mock agents using our test script
const mockAgents = {
  claude: {
    name: 'claude',
    command: './test/mock-cli-agent.sh',
    description: 'Mock Claude agent'
  },
  gemini: {
    name: 'gemini',
    command: './test/mock-cli-agent.sh',
    description: 'Mock Gemini agent'
  },
  codex: {
    name: 'codex',
    command: './test/mock-cli-agent.sh',
    description: 'Mock Codex agent'
  }
};

console.log('🧪 Starting Maestro CLI with mock agents...\n');

const maestro = new MaestroCLI(mockAgents.gemini, mockAgents);
maestro.start();

