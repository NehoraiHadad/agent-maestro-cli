/**
 * Environment variable filtering configuration
 */

/**
 * Safe environment variables that can be passed to PTY processes
 * These are essential for CLI tools to function properly
 */
export const SAFE_ENV_ALLOWLIST: readonly string[] = [
  // Essential system variables
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'TERM',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'PWD',
  'TMPDIR',
  'TMP',
  'TEMP',

  // Display and terminal
  'DISPLAY',
  'COLORTERM',
  'TERM_PROGRAM',
  'TERM_PROGRAM_VERSION',

  // Node.js specific (needed for npm, etc.)
  'NODE_ENV',
  'NODE_PATH',
  'npm_config_user_agent',

  // Editor preferences
  'EDITOR',
  'VISUAL',

  // Locale
  'LANGUAGE',

  // Platform-specific
  'OS',
  'PROCESSOR_ARCHITECTURE',
  'SYSTEMROOT', // Windows
  'windir', // Windows
] as const;

/**
 * Sensitive environment variable patterns that should NEVER be passed
 * These are additional safeguards beyond the allowlist
 */
export const SENSITIVE_ENV_PATTERNS: readonly RegExp[] = [
  /API_KEY$/i,
  /SECRET$/i,
  /TOKEN$/i,
  /PASSWORD$/i,
  /CREDENTIAL$/i,
  /PRIVATE_KEY$/i,
  /AUTH.*KEY$/i,
  /^AWS_/i,
  /^AZURE_/i,
  /^GCP_/i,
  /^GITHUB_TOKEN$/i,
  /^NPM_TOKEN$/i,
  /^ANTHROPIC_/i,
  /^OPENAI_/i,
  /^GEMINI_/i,
] as const;

/**
 * Additional environment variables that might be needed for specific CLIs
 * Users can customize this list based on their needs
 */
export const OPTIONAL_SAFE_ENV: readonly string[] = [
  'SSH_AUTH_SOCK', // For git operations with SSH
  'GIT_AUTHOR_NAME',
  'GIT_AUTHOR_EMAIL',
  'GIT_COMMITTER_NAME',
  'GIT_COMMITTER_EMAIL',
] as const;
