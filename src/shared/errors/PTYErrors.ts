/**
 * PTY (Pseudo-Terminal) related errors
 */
import { BaseError } from './BaseError.js';

export class PTYError extends BaseError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(
      message,
      'PTY_ERROR',
      context
    );
  }
}

export class PTYSpawnError extends BaseError {
  constructor(command: string, reason: string) {
    super(
      `Failed to spawn PTY process '${command}': ${reason}`,
      'PTY_SPAWN_ERROR',
      { command, reason }
    );
  }
}

export class PTYProcessNotFoundError extends BaseError {
  constructor(processId: string) {
    super(
      `PTY process '${processId}' not found`,
      'PTY_PROCESS_NOT_FOUND',
      { processId }
    );
  }
}

export class PTYProcessNotRunningError extends BaseError {
  constructor(processId: string) {
    super(
      `PTY process '${processId}' is not running`,
      'PTY_PROCESS_NOT_RUNNING',
      { processId }
    );
  }
}

export class PTYWriteError extends BaseError {
  constructor(processId: string, reason: string) {
    super(
      `Failed to write to PTY process '${processId}': ${reason}`,
      'PTY_WRITE_ERROR',
      { processId, reason }
    );
  }
}
