/**
 * Input validation types
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedValue?: string;
}

export interface ValidationRule {
  name: string;
  validate: (input: string) => boolean;
  errorMessage: string;
}

export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowedPatterns?: RegExp[];
  forbiddenPatterns?: RegExp[];
  sanitize?: boolean;
}
