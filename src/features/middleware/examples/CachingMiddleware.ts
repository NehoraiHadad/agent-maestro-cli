/**
 * CachingMiddleware - Caches responses for repeated queries
 * Demonstrates response caching with TTL support
 */

import type { Middleware, MiddlewareContext } from '../types.js';
import type { AgentExecutionResult } from '../../../shared/types/index.js';
import crypto from 'crypto';

export interface CachingOptions {
  /** Time-to-live in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Maximum cache size (default: 100 entries) */
  maxSize?: number;
  /** Enable cache hit logging */
  enableLogging?: boolean;
}

interface CacheEntry {
  result: AgentExecutionResult;
  timestamp: number;
  hits: number;
}

/**
 * Caching middleware for storing and retrieving responses
 */
export class CachingMiddleware implements Middleware {
  readonly name = 'caching';
  readonly description = 'Cache responses for repeated queries';
  readonly priority = 20; // Very high priority to check cache first

  private options: Required<CachingOptions>;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(options: CachingOptions = {}) {
    this.options = {
      ttl: options.ttl ?? 5 * 60 * 1000, // 5 minutes
      maxSize: options.maxSize ?? 100,
      enableLogging: options.enableLogging ?? false,
    };
  }

  /**
   * Before hook - not used for caching
   */
  async before(message: string, context: MiddlewareContext): Promise<string> {
    // Store message in context for later
    if (context.metadata) {
      context.metadata.originalMessage = message;
    }

    return message; // Pass through unchanged
  }

  /**
   * After hook - cache the result
   */
  async after(
    result: AgentExecutionResult,
    context: MiddlewareContext
  ): Promise<AgentExecutionResult> {
    // Get original message from context
    const message = context.metadata?.originalMessage as string | undefined;
    if (!message) {
      return result;
    }

    // Generate cache key
    const cacheKey = this.generateCacheKey(message, context.agent);

    // Store in cache
    this.set(cacheKey, result);

    return result; // Pass through unchanged
  }

  /**
   * Check if a message has a cached result
   * This should be called BEFORE executing the agent
   */
  get(message: string, agent: string): AgentExecutionResult | null {
    const cacheKey = this.generateCacheKey(message, agent);
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.options.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    // Increment hit counter
    entry.hits++;

    if (this.options.enableLogging) {
      console.log(`[Cache] Hit for key: ${cacheKey} (hits: ${entry.hits})`);
    }

    return entry.result;
  }

  /**
   * Store a result in cache
   */
  private set(key: string, result: AgentExecutionResult): void {
    // Evict oldest entry if cache is full
    if (this.cache.size >= this.options.maxSize) {
      const oldestKey = this.findOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0,
    });

    if (this.options.enableLogging) {
      console.log(`[Cache] Stored key: ${key}`);
    }
  }

  /**
   * Generate cache key from message and agent
   */
  private generateCacheKey(message: string, agent: string): string {
    const normalized = message.trim().toLowerCase();
    const hash = crypto
      .createHash('md5')
      .update(`${agent}:${normalized}`)
      .digest('hex');
    return hash;
  }

  /**
   * Find oldest cache entry key
   */
  private findOldestKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    totalHits: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: now - entry.timestamp,
    }));

    return {
      size: this.cache.size,
      maxSize: this.options.maxSize,
      totalHits: entries.reduce((sum, e) => sum + e.hits, 0),
      entries,
    };
  }
}
