/**
 * Types for PTY (Pseudo-Terminal) operations
 */

export interface PTYOptions {
  name?: string;
  cols?: number;
  rows?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}

export type PTYStatus = 'running' | 'exited' | 'killed';

export interface PTYProcessInfo {
  process: unknown; // Will be node-pty IPty type
  command: string;
  args: string[];
  startTime: number;
  buffer: string;
  status: PTYStatus;
  exitCode?: number;
  signal?: number | string;
}

export interface PTYExitInfo {
  exitCode: number;
  signal?: number | string;
}

export interface PTYEventHandlers {
  data: Array<(data: string) => void>;
  exit: Array<(info: PTYExitInfo) => void>;
}
