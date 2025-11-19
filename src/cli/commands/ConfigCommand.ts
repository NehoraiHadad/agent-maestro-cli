/**
 * ConfigCommand.ts
 * CLI commands for configuration management
 */

import { Command } from 'commander';
import { homedir } from 'os';
import { join } from 'path';
import { ConfigManager } from '../../features/orchestration/ConfigManager.js';
import chalk from 'chalk';

export class ConfigCommand {
  /**
   * Register config command and subcommands
   */
  static register(program: Command): void {
    const configCmd = program
      .command('config')
      .description('Manage AgentMaestro configuration');

    // config get <key>
    configCmd
      .command('get')
      .argument('[key]', 'Configuration key to get (omit to get all)')
      .description('Get a configuration value')
      .action((key?: string) => {
        ConfigCommand.executeGet(key);
      });

    // config set <key> <value>
    configCmd
      .command('set')
      .argument('<key>', 'Configuration key to set')
      .argument('<value>', 'Configuration value')
      .description('Set a configuration value')
      .action((key: string, value: string) => {
        ConfigCommand.executeSet(key, value);
      });

    // config list
    configCmd
      .command('list')
      .description('List all configuration values')
      .action(() => {
        ConfigCommand.executeList();
      });

    // config reset
    configCmd
      .command('reset')
      .description('Reset configuration to defaults')
      .option('-y, --yes', 'Skip confirmation')
      .action((options: { yes?: boolean }) => {
        ConfigCommand.executeReset(options.yes);
      });

    // config path
    configCmd
      .command('path')
      .description('Show the path to the configuration file')
      .action(() => {
        ConfigCommand.executePath();
      });

    // config validate
    configCmd
      .command('validate')
      .description('Validate the configuration file')
      .action(() => {
        ConfigCommand.executeValidate();
      });
  }

  /**
   * Execute config get command
   */
  static executeGet(key?: string): void {
    try {
      const configManager = ConfigManager.loadWithPriority();

      if (key) {
        // Get specific key
        const value = this.getNestedValue(configManager.getAll(), key);

        if (value === undefined) {
          console.error(chalk.red(`Error: Configuration key "${key}" not found`));
          process.exit(1);
        }

        console.log(chalk.cyan(key) + ': ' + chalk.white(JSON.stringify(value, null, 2)));
      } else {
        // Get all config
        const config = configManager.getAll();
        console.log(chalk.green('Current configuration:'));
        console.log(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Execute config set command
   */
  static executeSet(key: string, value: string): void {
    try {
      const configManager = ConfigManager.loadWithPriority();
      const configPath = join(homedir(), '.maestrorc.json');

      // Parse value
      const parsedValue = this.parseValue(value);

      // Set the value
      const config = configManager.getAll();
      this.setNestedValue(config, key, parsedValue);

      // Create a new config manager with the updated config to validate
      const newConfigManager = new ConfigManager(config);

      // Save to file
      newConfigManager.save(configPath);

      console.log(chalk.green('✓') + ' Configuration updated successfully');
      console.log(chalk.cyan(key) + ' = ' + chalk.white(JSON.stringify(parsedValue)));
      console.log(chalk.gray(`Saved to: ${configPath}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Execute config list command
   */
  static executeList(): void {
    try {
      const configManager = ConfigManager.loadWithPriority();
      const config = configManager.getAll();

      console.log(chalk.green('Configuration:'));
      console.log('');

      // Display in a readable format
      this.displayConfig(config);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Execute config reset command
   */
  static executeReset(skipConfirmation = false): void {
    try {
      const configPath = join(homedir(), '.maestrorc.json');

      if (!skipConfirmation) {
        console.log(chalk.yellow('Warning: This will reset all configuration to defaults.'));
        console.log(chalk.gray(`Config file: ${configPath}`));
        console.log('');
        console.log('Run with --yes to confirm: ' + chalk.cyan('maestro config reset --yes'));
        process.exit(0);
      }

      const configManager = new ConfigManager();
      configManager.save(configPath);

      console.log(chalk.green('✓') + ' Configuration reset to defaults');
      console.log(chalk.gray(`Saved to: ${configPath}`));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Execute config path command
   */
  static executePath(): void {
    const configPath = join(homedir(), '.maestrorc.json');
    console.log(configPath);
  }

  /**
   * Execute config validate command
   */
  static executeValidate(): void {
    try {
      const configManager = ConfigManager.loadWithPriority();
      const validation = configManager.validate();

      if (validation.valid) {
        console.log(chalk.green('✓') + ' Configuration is valid');
      } else {
        console.log(chalk.red('✗') + ' Configuration validation failed:');
        validation.errors.forEach(error => {
          console.log(chalk.red('  • ') + error);
        });
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private static getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Set nested value in object using dot notation
   */
  private static setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Parse value from string
   */
  private static parseValue(value: string): any {
    // Try to parse as JSON first
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
      return num;
    }

    // Try to parse as JSON object/array
    if (value.startsWith('{') || value.startsWith('[')) {
      try {
        return JSON.parse(value);
      } catch {
        // Fall through to string
      }
    }

    // Return as string
    return value;
  }

  /**
   * Display configuration in a readable format
   */
  private static displayConfig(config: any, indent = 0): void {
    const indentStr = '  '.repeat(indent);

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        console.log(indentStr + chalk.cyan(key) + ':');
        this.displayConfig(value, indent + 1);
      } else {
        const displayValue = typeof value === 'string'
          ? chalk.white(`"${value}"`)
          : chalk.white(JSON.stringify(value));
        console.log(indentStr + chalk.cyan(key) + ': ' + displayValue);
      }
    }
  }
}
