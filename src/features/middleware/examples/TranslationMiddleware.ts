/**
 * TranslationMiddleware - Example middleware for auto-translation
 * Demonstrates message preprocessing with language detection
 */

import type { Middleware, MiddlewareContext } from '../types.js';
import type { AgentExecutionResult } from '../../../shared/types/index.js';

export interface TranslationOptions {
  /** Target language (e.g., 'en', 'es', 'fr') */
  targetLanguage?: string;
  /** Source language (auto-detect if not provided) */
  sourceLanguage?: string;
  /** Enable translation for responses */
  translateResponses?: boolean;
}

/**
 * Translation middleware for message and response translation
 * Note: This is a demonstration - implement actual translation API integration
 */
export class TranslationMiddleware implements Middleware {
  readonly name = 'translation';
  readonly description = 'Auto-translate messages and responses';
  readonly priority = 10; // High priority to run early

  private options: Required<TranslationOptions>;

  constructor(options: TranslationOptions = {}) {
    this.options = {
      targetLanguage: options.targetLanguage ?? 'en',
      sourceLanguage: options.sourceLanguage ?? 'auto',
      translateResponses: options.translateResponses ?? false,
    };
  }

  /**
   * Before hook - translate message to target language
   */
  async before(message: string, _context: MiddlewareContext): Promise<string> {
    // Skip if already in target language
    if (this.options.sourceLanguage === this.options.targetLanguage) {
      return message;
    }

    // Detect language (simplified - in production, use a proper library)
    const detectedLang = this.detectLanguage(message);

    if (detectedLang === this.options.targetLanguage) {
      return message;
    }

    // Translate message (stub - implement actual translation)
    // In production, integrate with Google Translate API, DeepL, etc.
    const translatedMessage = await this.translate(
      message,
      detectedLang,
      this.options.targetLanguage
    );

    return translatedMessage;
  }

  /**
   * After hook - translate response if enabled
   */
  async after(
    result: AgentExecutionResult,
    _context: MiddlewareContext
  ): Promise<AgentExecutionResult> {
    if (!this.options.translateResponses) {
      return result;
    }

    // Translate response content
    const translatedContent = await this.translate(
      result.content,
      this.options.targetLanguage,
      this.options.sourceLanguage === 'auto' ? 'en' : this.options.sourceLanguage
    );

    return {
      ...result,
      content: translatedContent,
    };
  }

  /**
   * Detect language (simplified stub)
   * In production, use a proper language detection library
   */
  private detectLanguage(text: string): string {
    // Simplified detection based on common patterns
    const patterns: Record<string, RegExp> = {
      es: /[¿¡]/,
      fr: /[àâäèéêëîïôœùûüÿç]/i,
      de: /[äöüß]/i,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(text)) {
        return lang;
      }
    }

    return 'en'; // Default to English
  }

  /**
   * Translate text (stub for demonstration)
   * In production, integrate with a translation API
   */
  private async translate(
    text: string,
    _sourceLang: string,
    _targetLang: string
  ): Promise<string> {
    // Stub implementation - return original text
    // In production, call translation API:
    // - Google Translate API
    // - DeepL API
    // - Azure Translator
    // - etc.

    // Example integration (commented):
    // const response = await fetch('https://translation-api.example.com/translate', {
    //   method: 'POST',
    //   body: JSON.stringify({ text, source: sourceLang, target: targetLang })
    // });
    // const data = await response.json();
    // return data.translatedText;

    return text; // Return original for now
  }
}
