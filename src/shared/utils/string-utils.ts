/**
 * String manipulation utilities
 */

/**
 * Truncate string to specified length
 */
export function truncate(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Extract filename from path
 */
export function getFilename(path: string): string {
  return path.split('/').pop() || path;
}

/**
 * Check if string contains any of the patterns
 */
export function containsAny(str: string, patterns: string[]): boolean {
  return patterns.some(pattern => str.includes(pattern));
}

/**
 * Remove multiple whitespace and trim
 */
export function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Extract JSON from string
 */
export function extractJSON(str: string): unknown | null {
  try {
    const jsonMatch = str.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
}

/**
 * Clean line breaks (keep max 2 consecutive)
 */
export function cleanLineBreaks(str: string): string {
  return str.replace(/\n{3,}/g, '\n\n');
}
