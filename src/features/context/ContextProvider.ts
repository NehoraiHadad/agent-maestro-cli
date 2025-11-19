/**
 * ContextProvider.ts
 * Provides context information from git, environment, and project
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { GitContext, EnvContext, ProjectContext, Context, ContextConfig } from './types.js';

/**
 * Provides context information for message enrichment
 */
export class ContextProvider {
  private cwd: string;
  private config: ContextConfig;

  constructor(cwd: string = process.cwd(), config?: Partial<ContextConfig>) {
    this.cwd = cwd;
    this.config = {
      enabled: true,
      includeGit: true,
      includeEnv: true,
      includeProject: true,
      smartSelection: true,
      maxRecentCommits: 3,
      ...config
    };
  }

  /**
   * Get git context information
   */
  async getGitContext(): Promise<GitContext> {
    if (!this.config.includeGit) {
      return {};
    }

    try {
      // Check if it's a git repository
      const isGitRepo = existsSync(join(this.cwd, '.git'));
      if (!isGitRepo) {
        return { isGitRepo: false };
      }

      const context: GitContext = { isGitRepo: true };

      try {
        // Get current branch
        const branch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: this.cwd,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();
        context.branch = branch;
      } catch {
        // Ignore branch errors
      }

      try {
        // Check for uncommitted changes
        const status = execSync('git status --porcelain', {
          cwd: this.cwd,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        const lines = status.split('\n').filter(line => line.trim());
        context.hasUncommittedChanges = lines.length > 0;
        context.uncommittedFiles = lines.length;
      } catch {
        // Ignore status errors
      }

      try {
        // Get recent commits
        const commits = execSync(
          `git log -${this.config.maxRecentCommits} --oneline --no-decorate`,
          {
            cwd: this.cwd,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
          }
        ).trim();

        if (commits) {
          context.recentCommits = commits.split('\n').map(line => line.substring(0, 60));
        }
      } catch {
        // Ignore log errors
      }

      return context;
    } catch {
      return { isGitRepo: false };
    }
  }

  /**
   * Get environment context information
   */
  async getEnvContext(): Promise<EnvContext> {
    if (!this.config.includeEnv) {
      return {};
    }

    try {
      const context: EnvContext = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        cwd: this.cwd,
        shell: process.env.SHELL
      };

      return context;
    } catch {
      return {};
    }
  }

  /**
   * Get project context information
   */
  async getProjectContext(): Promise<ProjectContext> {
    if (!this.config.includeProject) {
      return {};
    }

    try {
      const context: ProjectContext = {};

      // Check for package.json
      const packageJsonPath = join(this.cwd, 'package.json');
      context.hasPackageJson = existsSync(packageJsonPath);

      if (context.hasPackageJson) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
          context.name = packageJson.name;
          context.version = packageJson.version;
          context.description = packageJson.description;

          // Detect language/framework
          if (packageJson.dependencies || packageJson.devDependencies) {
            const deps = {
              ...packageJson.dependencies,
              ...packageJson.devDependencies
            };

            // Detect framework
            if (deps['react']) {
              context.framework = 'React';
            } else if (deps['vue']) {
              context.framework = 'Vue';
            } else if (deps['@angular/core']) {
              context.framework = 'Angular';
            } else if (deps['next']) {
              context.framework = 'Next.js';
            } else if (deps['express']) {
              context.framework = 'Express';
            } else if (deps['fastify']) {
              context.framework = 'Fastify';
            }

            // Detect if TypeScript
            if (deps['typescript'] || existsSync(join(this.cwd, 'tsconfig.json'))) {
              context.language = 'TypeScript';
            } else {
              context.language = 'JavaScript';
            }
          }
        } catch {
          // Ignore package.json parsing errors
        }
      }

      // Check for README
      const readmePaths = ['README.md', 'readme.md', 'README.MD', 'README'];
      context.hasReadme = readmePaths.some(path => existsSync(join(this.cwd, path)));

      return context;
    } catch {
      return {};
    }
  }

  /**
   * Get relevant context based on message content
   * Uses smart selection to determine which context to include
   */
  async getRelevantContext(message: string): Promise<Context> {
    if (!this.config.enabled) {
      return {};
    }

    const context: Context = {};

    if (!this.config.smartSelection) {
      // Include all enabled contexts
      if (this.config.includeGit) {
        context.git = await this.getGitContext();
      }
      if (this.config.includeEnv) {
        context.env = await this.getEnvContext();
      }
      if (this.config.includeProject) {
        context.project = await this.getProjectContext();
      }
      return context;
    }

    // Smart selection based on message keywords
    const messageLower = message.toLowerCase();

    // Git-related keywords
    const gitKeywords = [
      'git', 'branch', 'commit', 'merge', 'pull', 'push',
      'checkout', 'status', 'diff', 'log', 'clone', 'repository',
      'repo', 'version control', 'uncommitted', 'staged'
    ];
    const needsGit = gitKeywords.some(keyword => messageLower.includes(keyword));

    // Environment-related keywords
    const envKeywords = [
      'environment', 'env', 'platform', 'system', 'node',
      'runtime', 'os', 'operating system', 'shell', 'terminal',
      'path', 'directory', 'cwd', 'current directory'
    ];
    const needsEnv = envKeywords.some(keyword => messageLower.includes(keyword));

    // Project-related keywords
    const projectKeywords = [
      'project', 'package', 'dependencies', 'dependency', 'framework',
      'library', 'readme', 'documentation', 'setup', 'install',
      'build', 'compile', 'test', 'typescript', 'javascript'
    ];
    const needsProject = projectKeywords.some(keyword => messageLower.includes(keyword));

    // If no specific context is detected, include project context by default
    // (most useful for general questions)
    const hasSpecificContext = needsGit || needsEnv || needsProject;

    if (needsGit && this.config.includeGit) {
      context.git = await this.getGitContext();
    }

    if (needsEnv && this.config.includeEnv) {
      context.env = await this.getEnvContext();
    }

    if ((needsProject || !hasSpecificContext) && this.config.includeProject) {
      context.project = await this.getProjectContext();
    }

    return context;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextConfig {
    return { ...this.config };
  }
}
