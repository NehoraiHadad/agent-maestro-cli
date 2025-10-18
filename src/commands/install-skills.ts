/**
 * Install AgentMaestro Skills for Claude Code
 *
 * This command copies the maestro-delegation-advisor skill to the user's
 * Claude Code skills directory (~/.claude/skills/), enabling Claude to
 * make intelligent delegation decisions automatically.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConsoleLogger } from '../features/ui/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = new ConsoleLogger();

/**
 * Install the delegation advisor skill
 */
export async function installSkills(): Promise<boolean> {
  logger.info('🎓 Installing AgentMaestro Skills for Claude Code...\n');

  try {
    // Paths
    const skillSource = path.join(__dirname, '../../skills/maestro-delegation-advisor');
    const claudeSkillsBase = path.join(os.homedir(), '.claude', 'skills');
    const skillTarget = path.join(claudeSkillsBase, 'maestro-delegation-advisor');

    // Check if source skill exists
    if (!fs.existsSync(skillSource)) {
      logger.error('❌ Skill source directory not found!');
      logger.error(`   Expected at: ${skillSource}`);
      return false;
    }

    // Check if skill is already installed
    if (fs.existsSync(skillTarget)) {
      logger.warn('⚠️  Maestro delegation advisor skill is already installed.');
      logger.info('   Location: ' + skillTarget);

      // Ask if user wants to reinstall (update)
      logger.info('\n   To update, remove the old version first:');
      logger.info(`   rm -rf ${skillTarget}`);
      logger.info('   Then run: maestro install-skills\n');
      return true;
    }

    // Create .claude/skills directory if it doesn't exist
    if (!fs.existsSync(claudeSkillsBase)) {
      logger.info('📁 Creating Claude skills directory...');
      fs.mkdirSync(claudeSkillsBase, { recursive: true });
      logger.success('   Created: ' + claudeSkillsBase);
    }

    // Copy the skill
    logger.info('📦 Copying maestro-delegation-advisor skill...');
    copyDirectoryRecursive(skillSource, skillTarget);
    logger.success('   Installed to: ' + skillTarget);

    // Success message
    logger.info('\n✅ AgentMaestro Skills installed successfully!\n');

    // Instructions
    logger.info('📖 What happens next:\n');
    logger.info('   1. The skill is now in your ~/.claude/skills/ directory');
    logger.info('   2. Claude Code will load it automatically on next startup');
    logger.info('   3. Claude will use it to make smart delegation decisions\n');

    logger.info('💡 How to use:\n');
    logger.info('   Just run maestro normally with Claude as primary agent:');
    logger.info('   $ maestro --primary claude\n');
    logger.info('   Claude will now intelligently decide when and how to delegate');
    logger.info('   tasks to Codex and Gemini based on the task requirements.\n');

    logger.info('🔍 Installed skill:');
    logger.info('   - maestro-delegation-advisor');
    logger.info('     Expert system for intelligent task delegation\n');

    return true;

  } catch (error) {
    logger.error('❌ Installation failed!');
    if (error instanceof Error) {
      logger.error('   Error: ' + error.message);
    }
    return false;
  }
}

/**
 * Uninstall the delegation advisor skill
 */
export async function uninstallSkills(): Promise<boolean> {
  logger.info('🗑️  Uninstalling AgentMaestro Skills...\n');

  try {
    const skillTarget = path.join(os.homedir(), '.claude', 'skills', 'maestro-delegation-advisor');

    if (!fs.existsSync(skillTarget)) {
      logger.warn('⚠️  Maestro delegation advisor skill is not installed.');
      return true;
    }

    // Remove the skill
    logger.info('📦 Removing maestro-delegation-advisor skill...');
    fs.rmSync(skillTarget, { recursive: true, force: true });
    logger.success('   Removed from: ~/.claude/skills/maestro-delegation-advisor');

    logger.info('\n✅ AgentMaestro Skills uninstalled successfully!\n');
    logger.info('   Restart Claude Code for changes to take effect.\n');

    return true;

  } catch (error) {
    logger.error('❌ Uninstallation failed!');
    if (error instanceof Error) {
      logger.error('   Error: ' + error.message);
    }
    return false;
  }
}

/**
 * Check if skills are installed
 */
export function checkSkillsInstalled(): boolean {
  const skillTarget = path.join(os.homedir(), '.claude', 'skills', 'maestro-delegation-advisor');
  return fs.existsSync(skillTarget);
}

/**
 * Show skill status
 */
export async function showSkillsStatus(): Promise<void> {
  const isInstalled = checkSkillsInstalled();
  const skillPath = path.join(os.homedir(), '.claude', 'skills', 'maestro-delegation-advisor');

  logger.info('🎓 AgentMaestro Skills Status\n');

  if (isInstalled) {
    logger.success('✅ Installed');
    logger.info(`   Location: ${skillPath}`);

    // Check for SKILL.md
    const skillMdPath = path.join(skillPath, 'SKILL.md');
    if (fs.existsSync(skillMdPath)) {
      const stats = fs.statSync(skillMdPath);
      logger.info(`   Last modified: ${stats.mtime.toLocaleString()}`);

      // Read skill metadata from YAML frontmatter
      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const nameMatch = content.match(/^name:\s*(.+)$/m);
        const descMatch = content.match(/^description:\s*(.+)$/m);

        if (nameMatch && descMatch) {
          logger.info(`   Name: ${nameMatch[1]}`);
          logger.info(`   Description: ${descMatch[1].substring(0, 80)}...`);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }

    logger.info('\n💡 The skill is active when using Claude Code');
    logger.info('   Claude will automatically use it for delegation decisions\n');

  } else {
    logger.warn('❌ Not installed');
    logger.info('\n   To install:');
    logger.info('   $ maestro install-skills\n');
  }
}

/**
 * Helper: Recursively copy directory
 */
function copyDirectoryRecursive(source: string, target: string): void {
  // Create target directory
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      copyDirectoryRecursive(sourcePath, targetPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}
