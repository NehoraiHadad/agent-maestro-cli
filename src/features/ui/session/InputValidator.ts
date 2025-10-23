/**
 * InputValidator - validates and checks user input
 */
export class InputValidator {
  private readonly exitCommands = ['exit', 'quit', 'q', 'bye'];

  /**
   * Check if input is an exit command
   * @param input - User input to check
   * @returns True if input is an exit command
   */
  isExitCommand(input: string): boolean {
    return this.exitCommands.includes(input.toLowerCase());
  }

  /**
   * Check if input is empty or whitespace only
   * @param input - User input to check
   * @returns True if input is empty
   */
  isEmpty(input: string): boolean {
    return input.trim().length === 0;
  }
}
