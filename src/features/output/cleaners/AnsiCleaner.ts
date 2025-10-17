/**
 * AnsiCleaner - Removes ANSI escape codes from text
 *
 * Handles various ANSI sequences including:
 * - Color codes
 * - Cursor movement
 * - Terminal control sequences
 * - OSC (Operating System Command) sequences
 */

export class AnsiCleaner {
  /**
   * Clean all ANSI escape codes from text
   */
  clean(text: string): string {
    if (!text) {
      return '';
    }

    let cleaned = text;
    cleaned = this.removeEscapeCodes(cleaned);
    cleaned = this.removeColorCodes(cleaned);
    cleaned = this.removeCursorCodes(cleaned);

    return cleaned;
  }

  /**
   * Remove general ANSI escape codes
   */
  private removeEscapeCodes(text: string): string {
    // Remove general ANSI escape sequences: ESC [ ... [JKmsu]
    const generalPattern = /\x1B\[[0-9;]*[JKmsu]/g;
    let result = text.replace(generalPattern, '');

    // Remove OSC sequences: ESC ] ... BEL
    const oscPattern = /\x1B\][0-9;]*;[^\x07]*\x07/g;
    result = result.replace(oscPattern, '');

    // Remove ESC c (reset)
    result = result.replace(/\x1Bc/g, '');

    return result;
  }

  /**
   * Remove color codes
   */
  private removeColorCodes(text: string): string {
    // Remove color codes: ESC [ ... m
    const colorPattern = /\x1B\[[^m]*m/g;
    return text.replace(colorPattern, '');
  }

  /**
   * Remove cursor movement codes
   */
  private removeCursorCodes(text: string): string {
    // Remove cursor movement: ESC [ ... [a-zA-Z]
    const cursorPattern = /\x1B\[[\d;]*[a-zA-Z]/g;
    let result = text.replace(cursorPattern, '');

    // Remove other cursor codes
    result = result.replace(/\x1B\[[\d;]*[ABCDEFGH]/g, ''); // Cursor positioning
    result = result.replace(/\x1B\[[\d;]*[suK]/g, ''); // Save/restore position, erase

    return result;
  }
}
