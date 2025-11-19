/**
 * Types for session persistence
 */

import { SessionExport } from '../orchestration/SessionManager.js';

/**
 * Metadata for a saved session
 */
export interface SessionMetadata {
  sessionId: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  duration: number; // in milliseconds
  tags?: string[];
}

/**
 * Saved session with metadata
 */
export interface SavedSession {
  metadata: SessionMetadata;
  data: SessionExport;
}

/**
 * Session index for quick lookups
 */
export interface SessionIndex {
  sessions: Record<string, SessionMetadata>;
  lastUpdated: Date;
}
