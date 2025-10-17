#!/usr/bin/env node

/**
 * Live demo test - simulates real usage with delegation
 */

import { Maestro } from '../src/core/maestro.js';
import { DelegationHandler } from '../src/core/delegation-handler.js';
import { parseDelegationRequest, createDelegationRequest } from '../src/protocols/delegation-protocol.js';
import { Logger } from '../src/utils/logger.js';

console.log('');
Logger.header('🎭 AgentMaestro Live Demo Test');

console.log('This demo simulates how Maestro would work with real agents.\n');
Logger.separator();

// Demo 1: Protocol Testing
Logger.maestro('Demo 1: Testing Delegation Protocol');

const exampleDelegation = createDelegationRequest('gemini', 'Search for Flask security best practices', {
  priority: 'high'
});

console.log('\n📤 Creating delegation request:');
console.log(exampleDelegation);

const parsed = parseDelegationRequest(exampleDelegation);
console.log('\n📥 Parsed delegation:');
console.log(JSON.stringify(parsed, null, 2));

Logger.separator();

// Demo 2: Logging System
Logger.maestro('Demo 2: Testing Logging System');

console.log('\n');
Logger.debug('This is a debug message');
Logger.info('This is an info message');
Logger.success('This is a success message');
Logger.warn('This is a warning message');
Logger.error('This is an error message');

console.log('\n');
Logger.delegation('Gemini', 'Starting task');
Logger.delegation('Codex', 'Task completed');

console.log('\n');
Logger.agent('Claude Code', 'Processing request', 'cyan');
Logger.agent('Gemini CLI', 'Searching web', 'blue');
Logger.agent('Codex', 'Generating code', 'green');

Logger.separator();

// Demo 3: Simulated Workflow
Logger.maestro('Demo 3: Simulated Multi-Agent Workflow');

console.log('\n📋 Scenario: Build a Flask todo app\n');

Logger.info('User: "Build me a Flask todo app with security best practices"');
console.log('');

// Simulate primary agent thinking
setTimeout(() => {
  Logger.agent('Claude Code', 'Analyzing request...', 'cyan');

  setTimeout(() => {
    Logger.maestro('Delegating to Gemini for research');
    Logger.delegation('Gemini CLI', 'Starting task');

    setTimeout(() => {
      Logger.delegation('Gemini CLI', 'Task completed');
      console.log('');
      Logger.box(
        'Flask Security Best Practices:\n' +
        '- Use Flask-Login for authentication\n' +
        '- Implement CSRF protection\n' +
        '- Sanitize user inputs\n' +
        '- Use secure session cookies',
        'green'
      );

      setTimeout(() => {
        console.log('');
        Logger.maestro('Delegating to Codex for code generation');
        Logger.delegation('Codex', 'Starting task');

        setTimeout(() => {
          Logger.delegation('Codex', 'Task completed');
          console.log('');
          console.log('```python');
          console.log('from flask import Flask, request');
          console.log('from flask_login import LoginManager');
          console.log('');
          console.log('app = Flask(__name__)');
          console.log('login_manager = LoginManager()');
          console.log('# ... more code ...');
          console.log('```');

          setTimeout(() => {
            console.log('');
            Logger.agent('Claude Code', 'Reviewing and refactoring code...', 'cyan');

            setTimeout(() => {
              console.log('');
              Logger.success('✨ Complete Flask todo app generated!');
              console.log('');
              Logger.separator();

              // Demo 4: Statistics
              Logger.maestro('Demo 4: Session Statistics');
              console.log('');
              console.log('📊 Session Stats:');
              console.log('  • Primary Agent: Claude Code');
              console.log('  • Delegations: 2');
              console.log('  • Secondary Agents Used: Gemini CLI, Codex');
              console.log('  • Total Time: ~15 seconds');
              console.log('');
              Logger.separator();

              Logger.success('All demos completed successfully! ✨');
              console.log('');
              console.log('To use Maestro for real:');
              console.log('  node src/index.js --agent claude');
              console.log('');
            }, 500);
          }, 1000);
        }, 1500);
      }, 500);
    }, 2000);
  }, 1000);
}, 500);
