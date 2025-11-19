/**
 * StorageBackend - Abstract interface for session storage
 * Defines the contract for different storage implementations
 */

/**
 * Abstract storage interface for session persistence
 */
export interface StorageBackend {
  /**
   * Write session data to storage
   * @param sessionId - Unique session identifier
   * @param data - Serialized session data
   */
  write(sessionId: string, data: string): Promise<void>;

  /**
   * Read session data from storage
   * @param sessionId - Unique session identifier
   * @returns Serialized session data
   * @throws Error if session not found
   */
  read(sessionId: string): Promise<string>;

  /**
   * List all session IDs in storage
   * @returns Array of session IDs
   */
  list(): Promise<string[]>;

  /**
   * Delete a session from storage
   * @param sessionId - Unique session identifier
   */
  delete(sessionId: string): Promise<void>;

  /**
   * Check if a session exists in storage
   * @param sessionId - Unique session identifier
   * @returns True if session exists
   */
  exists(sessionId: string): Promise<boolean>;

  /**
   * Read session index
   * @returns Index data as a record
   */
  readIndex(): Promise<Record<string, any>>;

  /**
   * Write session index
   * @param index - Index data to write
   */
  writeIndex(index: Record<string, any>): Promise<void>;
}
