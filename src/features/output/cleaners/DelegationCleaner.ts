/**
 * DelegationCleaner - Removes delegation protocol strings from output
 *
 * Strips out MAESTRO delegation requests and results that should not
 * be visible in the final agent output.
 */

export class DelegationCleaner {
  /**
   * Clean all delegation protocol strings from text
   */
  clean(text: string): string {
    if (!text) {
      return '';
    }

    let cleaned = text;
    cleaned = this.removeDelegationRequests(cleaned);
    cleaned = this.removeDelegationResults(cleaned);

    return cleaned;
  }

  /**
   * Remove delegation request strings (MAESTRO_DELEGATE::...)
   */
  private removeDelegationRequests(text: string): string {
    // Remove MAESTRO_DELEGATE:: JSON blocks
    // Pattern matches: MAESTRO_DELEGATE::{...}
    const requestPattern = /MAESTRO_DELEGATE::\{[^}]*\}/g;
    let result = text.replace(requestPattern, '');

    // Also handle multi-line JSON objects
    const multilinePattern = /MAESTRO_DELEGATE::\{[\s\S]*?\}/g;
    result = result.replace(multilinePattern, '');

    return result;
  }

  /**
   * Remove delegation result blocks
   */
  private removeDelegationResults(text: string): string {
    let result = text;

    // Remove [MAESTRO_RESULT] blocks
    // Pattern: [MAESTRO_RESULT]\nAgent: ...\n===...\n...content...\n===...
    const resultPattern = /\[MAESTRO_RESULT\][^\n]*\n(?:Agent:[^\n]*\n)?={30,}\n[\s\S]*?={30,}\n?/g;
    result = result.replace(resultPattern, '');

    // Remove [MAESTRO_ERROR] blocks
    // Pattern: [MAESTRO_ERROR]\nAgent: ...\n===...\n...content...\n===...
    const errorPattern = /\[MAESTRO_ERROR\][^\n]*\n(?:Agent:[^\n]*\n)?={30,}\n[\s\S]*?={30,}\n?/g;
    result = result.replace(errorPattern, '');

    // Remove standalone markers
    result = result.replace(/\[MAESTRO_RESULT\]\n?/g, '');
    result = result.replace(/\[MAESTRO_ERROR\]\n?/g, '');

    return result;
  }
}
