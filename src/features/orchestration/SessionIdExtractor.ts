/**
 * SessionIdExtractor.ts
 * Extracts session IDs from CLI output using various patterns
 */

export interface SessionIdPattern {
  name: string;
  regex: RegExp;
}

/**
 * Utility class for extracting session IDs from agent CLI output
 */
export class SessionIdExtractor {
  private readonly patterns: SessionIdPattern[] = [
    {
      name: 'standard',
      regex: /Session ID:\s*([a-zA-Z0-9_-]+)/i
    },
    {
      name: 'alternative',
      regex: /session[_-]id[:\s]+([a-zA-Z0-9_-]+)/i
    },
    {
      name: 'uuid_format',
      regex: /\bsession_([a-zA-Z0-9_-]{8,})\b/i
    }
  ];

  /**
   * Extract session ID from text
   * @param text - Text to search for session ID
   * @returns Extracted session ID or null if not found
   */
  extract(text: string): string | null {
    for (const pattern of this.patterns) {
      const match = text.match(pattern.regex);
      if (match?.[1]) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Add a custom pattern for session ID extraction
   * @param name - Pattern name for debugging
   * @param regex - Regular expression pattern
   */
  addPattern(name: string, regex: RegExp): void {
    this.patterns.push({ name, regex });
  }

  /**
   * Get all registered patterns
   * @returns Array of pattern names and regexes
   */
  getPatterns(): SessionIdPattern[] {
    return [...this.patterns];
  }
}
