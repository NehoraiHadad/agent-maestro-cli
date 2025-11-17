/**
 * Configuration-related errors
 */
import { BaseError } from './BaseError.js';

export class ConfigValidationError extends BaseError {
  constructor(errors: string[]) {
    super(
      `Configuration validation failed: ${errors.join(', ')}`,
      'CONFIG_VALIDATION_ERROR',
      { errors }
    );
  }

  public get errors(): string[] {
    return this.context?.errors as string[];
  }
}
