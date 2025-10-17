/**
 * Detailed Logger - Captures comprehensive execution trace
 *
 * Records everything from startup to exit for troubleshooting and analysis:
 * - System configuration
 * - Agent invocations
 * - Raw output
 * - Parsed events
 * - Status updates
 * - Timing information
 * - Errors and warnings
 */

export class DetailedLogger {
  constructor(primaryAgent, config = {}) {
    this.primaryAgent = primaryAgent;
    this.config = config;
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();

    // Detailed event log
    this.events = [];

    // Raw output from agents
    this.rawOutputs = {};

    // Parsed events from streaming
    this.parsedEvents = {};

    // Error and warning log
    this.errors = [];
    this.warnings = [];

    // System information
    this.systemInfo = this.captureSystemInfo();

    // Log startup
    this.logEvent('startup', {
      primaryAgent: primaryAgent.name,
      config,
      systemInfo: this.systemInfo
    });
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    return `maestro-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Capture system information
   */
  captureSystemInfo() {
    return {
      platform: process.platform,
      nodeVersion: process.version,
      arch: process.arch,
      cwd: process.cwd(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Log a general event
   */
  logEvent(type, data = {}) {
    const event = {
      type,
      timestamp: Date.now(),
      relativeTime: Date.now() - this.startTime,
      ...data
    };
    this.events.push(event);
    return event;
  }

  /**
   * Log agent invocation
   */
  logAgentInvocation(agentId, agentName, command, args) {
    return this.logEvent('agent_invocation', {
      agentId,
      agentName,
      command,
      args: args.slice(), // Clone array
      fullCommand: `${command} ${args.join(' ')}`
    });
  }

  /**
   * Log raw output chunk from agent
   */
  logRawOutput(agentId, chunk) {
    if (!this.rawOutputs[agentId]) {
      this.rawOutputs[agentId] = {
        agentId,
        startTime: Date.now(),
        chunks: []
      };
    }

    this.rawOutputs[agentId].chunks.push({
      timestamp: Date.now(),
      data: chunk,
      length: chunk.length
    });

    return this.logEvent('raw_output', {
      agentId,
      chunkLength: chunk.length,
      totalLength: this.rawOutputs[agentId].chunks.reduce((sum, c) => sum + c.length, 0)
    });
  }

  /**
   * Log parsed streaming event
   */
  logParsedEvent(agentId, event) {
    if (!this.parsedEvents[agentId]) {
      this.parsedEvents[agentId] = [];
    }

    const parsedEvent = {
      timestamp: Date.now(),
      event: JSON.parse(JSON.stringify(event)) // Deep clone
    };

    this.parsedEvents[agentId].push(parsedEvent);

    return this.logEvent('parsed_event', {
      agentId,
      eventType: event.type,
      eventData: event
    });
  }

  /**
   * Log status update
   */
  logStatusUpdate(agentId, status, source = 'unknown') {
    return this.logEvent('status_update', {
      agentId,
      status,
      source // 'streaming' or 'fallback'
    });
  }

  /**
   * Log agent exit
   */
  logAgentExit(agentId, exitCode, duration) {
    return this.logEvent('agent_exit', {
      agentId,
      exitCode,
      duration
    });
  }

  /**
   * Log user message
   */
  logUserMessage(message) {
    return this.logEvent('user_message', {
      message,
      length: message.length
    });
  }

  /**
   * Log assistant response
   */
  logAssistantResponse(agent, content, cleaned = false) {
    return this.logEvent('assistant_response', {
      agent,
      content,
      length: content.length,
      cleaned
    });
  }

  /**
   * Log delegation
   */
  logDelegation(fromAgent, toAgent, prompt, result) {
    return this.logEvent('delegation', {
      fromAgent,
      toAgent,
      prompt,
      result
    });
  }

  /**
   * Log command execution
   */
  logCommand(command, args = []) {
    return this.logEvent('command', {
      command,
      args
    });
  }

  /**
   * Log error
   */
  logError(error, context = {}) {
    const errorEntry = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      context
    };

    this.errors.push(errorEntry);

    return this.logEvent('error', {
      message: error.message,
      context
    });
  }

  /**
   * Log warning
   */
  logWarning(message, context = {}) {
    const warningEntry = {
      timestamp: Date.now(),
      message,
      context
    };

    this.warnings.push(warningEntry);

    return this.logEvent('warning', {
      message,
      context
    });
  }

  /**
   * Get full raw output for an agent
   */
  getRawOutput(agentId) {
    const output = this.rawOutputs[agentId];
    if (!output) return null;

    return {
      ...output,
      fullOutput: output.chunks.map(c => c.data).join(''),
      totalChunks: output.chunks.length
    };
  }

  /**
   * Get all parsed events for an agent
   */
  getParsedEvents(agentId) {
    return this.parsedEvents[agentId] || [];
  }

  /**
   * Export detailed log
   */
  export() {
    const duration = Date.now() - this.startTime;

    return {
      // Metadata
      sessionId: this.sessionId,
      primaryAgent: this.primaryAgent.name,
      startTime: this.startTime,
      endTime: Date.now(),
      duration,

      // Configuration
      config: this.config,
      systemInfo: this.systemInfo,

      // Events timeline
      events: this.events,

      // Raw outputs
      rawOutputs: Object.keys(this.rawOutputs).reduce((acc, agentId) => {
        acc[agentId] = this.getRawOutput(agentId);
        return acc;
      }, {}),

      // Parsed events
      parsedEvents: this.parsedEvents,

      // Errors and warnings
      errors: this.errors,
      warnings: this.warnings,

      // Statistics
      stats: {
        totalEvents: this.events.length,
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        eventTypes: this.getEventTypeCounts(),
        agentsInvoked: Object.keys(this.rawOutputs).length
      }
    };
  }

  /**
   * Get count of each event type
   */
  getEventTypeCounts() {
    const counts = {};
    for (const event of this.events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Save detailed log to file
   */
  async saveToFile(filePath) {
    const fs = await import('fs/promises');
    const data = JSON.stringify(this.export(), null, 2);
    await fs.writeFile(filePath, data, 'utf8');
    return filePath;
  }

  /**
   * Generate summary report
   */
  generateSummary() {
    const exported = this.export();
    const duration = exported.duration;

    const summary = {
      sessionId: exported.sessionId,
      duration: `${(duration / 1000).toFixed(2)}s`,
      events: exported.stats.totalEvents,
      errors: exported.stats.totalErrors,
      warnings: exported.stats.totalWarnings,
      agents: exported.stats.agentsInvoked
    };

    return summary;
  }
}

export default DetailedLogger;
