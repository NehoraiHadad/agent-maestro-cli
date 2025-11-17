/**
 * InteractiveMenu.ts
 * Interactive CLI menu using inquirer
 */

import inquirer from 'inquirer';
import type { Agent } from '../../../shared/types/index.js';
import type { MenuSelection } from '../../../shared/types/ui.types.js';

/**
 * Interactive menu for CLI user interactions
 */
export class InteractiveMenu {
  /**
   * Prompt user to select an agent from a list
   * @param agents - Array of available agents
   * @returns Selected agent name
   */
  async selectAgent(agents: Agent[]): Promise<string> {
    if (agents.length === 0) {
      throw new Error('No agents available to select from');
    }

    // If only one agent, return it directly
    if (agents.length === 1) {
      return agents[0].name;
    }

    const choices = agents.map(agent => this.formatAgentChoice(agent));

    const answer = await inquirer.prompt<MenuSelection>([
      {
        type: 'list',
        name: 'agent',
        message: 'Select an agent to use:',
        choices,
        pageSize: 10
      }
    ]);

    return answer.agent;
  }

  /**
   * Prompt user for confirmation
   * @param message - Confirmation message
   * @returns True if confirmed, false otherwise
   */
  async confirm(message: string): Promise<boolean> {
    interface ConfirmAnswer {
      confirmed: boolean;
    }

    const answer = await inquirer.prompt<ConfirmAnswer>([
      {
        type: 'confirm',
        name: 'confirmed',
        message,
        default: false
      }
    ]);

    return answer.confirmed;
  }

  /**
   * Prompt user for text input
   * @param message - Input prompt message
   * @param defaultValue - Optional default value
   * @returns User input string
   */
  async input(message: string, defaultValue?: string): Promise<string> {
    interface InputAnswer {
      value: string;
    }

    const answer = await inquirer.prompt<InputAnswer>([
      {
        type: 'input',
        name: 'value',
        message,
        default: defaultValue,
        validate: (input: string) => {
          if (input.trim().length === 0) {
            return 'Input cannot be empty';
          }
          return true;
        }
      }
    ]);

    return answer.value.trim();
  }

  /**
   * Prompt user to select multiple items from a list
   * @param message - Prompt message
   * @param choices - Array of choices
   * @returns Selected items
   */
  async multiSelect(message: string, choices: string[]): Promise<string[]> {
    if (choices.length === 0) {
      throw new Error('No choices available to select from');
    }

    interface MultiSelectAnswer {
      selected: string[];
    }

    const answer = await inquirer.prompt<MultiSelectAnswer>([
      {
        type: 'checkbox',
        name: 'selected',
        message,
        choices
      }
    ]);

    if (answer.selected.length === 0) {
      throw new Error('You must select at least one item');
    }

    return answer.selected;
  }

  /**
   * Format an agent as a menu choice
   */
  private formatAgentChoice(agent: Agent): { name: string; value: string } {
    const colorSymbol = this.getColorSymbol(agent.color);
    const name = `${colorSymbol} ${agent.displayName} - ${agent.description}`;

    return {
      name,
      value: agent.name
    };
  }

  /**
   * Get a colored symbol for agent representation
   */
  private getColorSymbol(color: string): string {
    const symbols: Record<string, string> = {
      blue: '🔵',
      green: '🟢',
      yellow: '🟡',
      red: '🔴',
      purple: '🟣',
      cyan: '🔷',
      magenta: '🟪'
    };

    return symbols[color] || '⚪';
  }
}
