/**
 * Context types for smart context injection
 */

/**
 * Git context information
 */
export interface GitContext {
  branch?: string;
  hasUncommittedChanges?: boolean;
  uncommittedFiles?: number;
  recentCommits?: string[];
  isGitRepo?: boolean;
}

/**
 * Environment context information
 */
export interface EnvContext {
  nodeVersion?: string;
  platform?: string;
  arch?: string;
  cwd?: string;
  shell?: string;
}

/**
 * Project context information
 */
export interface ProjectContext {
  name?: string;
  version?: string;
  description?: string;
  language?: string;
  hasPackageJson?: boolean;
  hasReadme?: boolean;
  framework?: string;
}

/**
 * Combined context information
 */
export interface Context {
  git?: GitContext;
  env?: EnvContext;
  project?: ProjectContext;
}

/**
 * Context configuration options
 */
export interface ContextConfig {
  /** Enable context injection */
  enabled: boolean;
  /** Include git context */
  includeGit: boolean;
  /** Include environment context */
  includeEnv: boolean;
  /** Include project context */
  includeProject: boolean;
  /** Smart selection based on message content */
  smartSelection: boolean;
  /** Maximum number of recent commits to include */
  maxRecentCommits: number;
}

/**
 * Keywords for smart context selection
 */
export interface ContextKeywords {
  git: string[];
  env: string[];
  project: string[];
}
