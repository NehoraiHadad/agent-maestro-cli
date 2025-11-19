/**
 * SessionPersistence - Main persistence service
 * Manages session save/load/list/delete operations
 */

import { StorageBackend } from './StorageBackend.js';
import { SessionMetadata, SavedSession, SessionIndex } from './types.js';
import { SessionExport } from '../orchestration/SessionManager.js';

/**
 * Main session persistence service
 */
export class SessionPersistence {
  constructor(private storage: StorageBackend) {}

  /**
   * Save a session with optional metadata
   * @param session - Session export data
   * @param metadata - Optional metadata (name, tags, etc.)
   * @returns Session ID
   */
  async save(session: SessionExport, metadata?: Partial<SessionMetadata>): Promise<string> {
    const sessionId = session.sessionId;
    const now = new Date();

    // Create metadata
    const sessionMetadata: SessionMetadata = {
      sessionId,
      name: metadata?.name,
      createdAt: metadata?.createdAt || now,
      updatedAt: now,
      messageCount: session.summary.messageCount,
      duration: session.summary.duration,
      tags: metadata?.tags || []
    };

    // Create saved session
    const savedSession: SavedSession = {
      metadata: sessionMetadata,
      data: session
    };

    // Serialize and save
    const serialized = JSON.stringify(savedSession, null, 2);
    await this.storage.write(sessionId, serialized);

    // Update index
    await this.updateIndex(sessionMetadata);

    return sessionId;
  }

  /**
   * Load a session by ID
   * @param sessionId - Session identifier
   * @returns Saved session
   */
  async load(sessionId: string): Promise<SavedSession> {
    const data = await this.storage.read(sessionId);
    const savedSession = JSON.parse(data) as SavedSession;

    // Convert date strings back to Date objects
    savedSession.metadata.createdAt = new Date(savedSession.metadata.createdAt);
    savedSession.metadata.updatedAt = new Date(savedSession.metadata.updatedAt);
    savedSession.data.startTime = new Date(savedSession.data.startTime);
    savedSession.data.summary.startTime = new Date(savedSession.data.summary.startTime);

    return savedSession;
  }

  /**
   * List all saved sessions with metadata
   * @returns Array of session metadata
   */
  async list(): Promise<SessionMetadata[]> {
    const index = await this.getIndex();
    const metadata = Object.values(index.sessions);

    // Convert date strings to Date objects
    return metadata.map(meta => ({
      ...meta,
      createdAt: new Date(meta.createdAt),
      updatedAt: new Date(meta.updatedAt)
    }));
  }

  /**
   * Delete a session
   * @param sessionId - Session identifier
   */
  async delete(sessionId: string): Promise<void> {
    await this.storage.delete(sessionId);

    // Remove from index
    await this.removeFromIndex(sessionId);
  }

  /**
   * Check if a session exists
   * @param sessionId - Session identifier
   * @returns True if session exists
   */
  async exists(sessionId: string): Promise<boolean> {
    return this.storage.exists(sessionId);
  }

  /**
   * Find sessions by name
   * @param name - Session name (partial match)
   * @returns Array of matching session metadata
   */
  async findByName(name: string): Promise<SessionMetadata[]> {
    const allSessions = await this.list();
    const lowerName = name.toLowerCase();

    return allSessions.filter(session =>
      session.name?.toLowerCase().includes(lowerName)
    );
  }

  /**
   * Find sessions by tag
   * @param tag - Tag to search for
   * @returns Array of matching session metadata
   */
  async findByTag(tag: string): Promise<SessionMetadata[]> {
    const allSessions = await this.list();

    return allSessions.filter(session =>
      session.tags?.includes(tag)
    );
  }

  /**
   * Export a session to JSON string
   * @param sessionId - Session identifier
   * @returns JSON string
   */
  async exportToJson(sessionId: string): Promise<string> {
    const savedSession = await this.load(sessionId);
    return JSON.stringify(savedSession, null, 2);
  }

  /**
   * Export a session to Markdown
   * @param sessionId - Session identifier
   * @returns Markdown string
   */
  async exportToMarkdown(sessionId: string): Promise<string> {
    const savedSession = await this.load(sessionId);
    const { metadata, data } = savedSession;

    const lines: string[] = [];

    // Header
    lines.push(`# Session: ${metadata.name || metadata.sessionId}`);
    lines.push('');
    lines.push(`**Session ID:** ${metadata.sessionId}`);
    lines.push(`**Created:** ${metadata.createdAt.toLocaleString()}`);
    lines.push(`**Duration:** ${Math.floor(metadata.duration / 1000)}s`);
    lines.push(`**Messages:** ${metadata.messageCount}`);

    if (metadata.tags && metadata.tags.length > 0) {
      lines.push(`**Tags:** ${metadata.tags.join(', ')}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');

    // Messages
    lines.push('## Conversation');
    lines.push('');

    for (const message of data.messages) {
      const role = message.role === 'user' ? 'User' : 'Assistant';
      const metadata = message.metadata as Record<string, unknown>;
      const agent = metadata?.agent ? ` (${String(metadata.agent)})` : '';

      lines.push(`### ${role}${agent}`);
      lines.push('');
      lines.push(String(message.content));
      lines.push('');
    }

    // Summary
    lines.push('---');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Total Messages: ${data.summary.messageCount}`);
    lines.push(`- User Messages: ${data.summary.userMessages}`);
    lines.push(`- Assistant Messages: ${data.summary.assistantMessages}`);
    lines.push(`- Delegation Messages: ${data.summary.delegationMessages}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Get session index
   */
  private async getIndex(): Promise<SessionIndex> {
    const indexData = await this.storage.readIndex();
    return {
      sessions: indexData.sessions || {},
      lastUpdated: new Date(indexData.lastUpdated)
    };
  }

  /**
   * Update session index
   */
  private async updateIndex(metadata: SessionMetadata): Promise<void> {
    const index = await this.getIndex();
    index.sessions[metadata.sessionId] = metadata;
    index.lastUpdated = new Date();

    await this.storage.writeIndex(index);
  }

  /**
   * Remove session from index
   */
  private async removeFromIndex(sessionId: string): Promise<void> {
    const index = await this.getIndex();
    delete index.sessions[sessionId];
    index.lastUpdated = new Date();

    await this.storage.writeIndex(index);
  }
}
