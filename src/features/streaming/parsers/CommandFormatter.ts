/**
 * CommandFormatter.ts
 * Shared utilities for formatting bash commands into readable status messages
 * Used by both ClaudeParser and CodexParser
 */

/**
 * Strip bash -lc wrapper from command string
 * Handles: bash -lc ls → ls
 * Handles: bash -lc 'cat file' → cat file
 * Handles: bash -lc "cat file" → cat file
 */
export function stripBashWrapper(command: string): string {
  const bashPrefix = /^bash\s+-l?c\s+/;
  if (!bashPrefix.test(command)) {
    return command;
  }

  let cleaned = command.replace(bashPrefix, '');

  // Remove surrounding quotes if present
  if ((cleaned.startsWith("'") && cleaned.endsWith("'")) ||
      (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim();
}

/**
 * Format bash command into readable status message
 */
export function formatBashCommand(command: string, prefix: string = 'executing'): string {
  const trimmed = stripBashWrapper(command);

  // Git operations
  if (trimmed.startsWith('git ')) {
    const gitCmd = trimmed.split(' ')[1] || 'command';
    return `git: ${gitCmd}...`;
  }

  // NPM operations
  if (trimmed.startsWith('npm ')) {
    const npmCmd = trimmed.split(' ')[1] || 'command';
    return `npm: ${npmCmd}...`;
  }

  // File search operations
  if (trimmed.startsWith('grep ') || trimmed.startsWith('rg ')) {
    return 'searching files...';
  }

  if (trimmed.startsWith('find ') || trimmed.startsWith('fd ')) {
    return 'finding files...';
  }

  // File viewing
  if (trimmed.startsWith('cat ') || trimmed.startsWith('less ') ||
      trimmed.startsWith('head ') || trimmed.startsWith('tail ')) {
    return 'reading file...';
  }

  // File editing
  if (trimmed.startsWith('sed ') || trimmed.startsWith('awk ')) {
    return 'editing file...';
  }

  // Directory listing
  if (trimmed.startsWith('ls ')) {
    return 'listing files...';
  }

  // Directory operations
  if (trimmed.startsWith('cd ')) {
    return 'changing directory...';
  }

  if (trimmed.startsWith('mkdir ') || trimmed.startsWith('mkdirp ')) {
    return 'creating directory...';
  }

  // File operations
  if (trimmed.startsWith('cp ')) {
    return 'copying file...';
  }

  if (trimmed.startsWith('mv ')) {
    return 'moving file...';
  }

  if (trimmed.startsWith('rm ')) {
    return 'removing file...';
  }

  // Build/test operations
  if (trimmed.startsWith('make ')) {
    return 'building...';
  }

  if (trimmed.startsWith('cargo ')) {
    const cargoCmd = trimmed.split(' ')[1] || 'command';
    return `cargo: ${cargoCmd}...`;
  }

  if (trimmed.startsWith('go ')) {
    const goCmd = trimmed.split(' ')[1] || 'command';
    return `go: ${goCmd}...`;
  }

  // Generic execution - show first word
  const firstWord = trimmed.split(' ')[0];
  return `${prefix}: ${firstWord}`;
}

/**
 * Check if command is a search operation
 */
export function isSearchCommand(command: string): boolean {
  const cleaned = stripBashWrapper(command);
  const searchCommands = ['grep', 'find', 'ls', 'rg', 'fd', 'locate'];
  const cmdName = cleaned.split(' ')[0];
  return searchCommands.includes(cmdName);
}

/**
 * Check if command is an edit operation
 */
export function isEditCommand(command: string): boolean {
  const cleaned = stripBashWrapper(command);
  const editCommands = ['vim', 'nano', 'edit', 'vi', 'emacs', 'code', 'sed', 'awk'];
  const cmdName = cleaned.split(' ')[0];
  return editCommands.includes(cmdName);
}

/**
 * Check if command is a file read operation
 */
export function isReadCommand(command: string): boolean {
  const cleaned = stripBashWrapper(command);
  const readCommands = ['cat', 'head', 'tail', 'less', 'more'];
  const cmdName = cleaned.split(' ')[0];
  return readCommands.includes(cmdName);
}

/**
 * Extract filename from file path
 */
export function extractFilename(path: string): string {
  return path.split('/').pop() || path;
}
