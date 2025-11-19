import { describe, it, expect, beforeEach } from '@jest/globals';
import { StreamProcessor } from '../../src/features/streaming/StreamProcessor.js';
import type { ThinkingEvent, ToolUseEvent } from '../../src/shared/types/streaming.types.js';

describe('StreamProcessor', () => {
  let processor: StreamProcessor;

  beforeEach(() => {
    processor = new StreamProcessor();
  });

  describe('Basic Processing', () => {
    it('should process simple text data', () => {
      const result = processor.processData('claude', 'Hello, world!');

      expect(result.text).toBe('Hello, world!');
      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('text');
      expect(result.metadata.eventCount).toBe(1);
      expect(result.metadata.hasThinking).toBe(false);
      expect(result.metadata.hasToolUse).toBe(false);
    });

    it('should handle empty data', () => {
      const result = processor.processData('claude', '');

      expect(result.text).toBe('');
      expect(result.events).toHaveLength(0);
      expect(result.metadata.eventCount).toBe(0);
    });

    it('should handle whitespace-only data', () => {
      const result = processor.processData('claude', '   \n\t  ');

      // Parser trims whitespace-only data and returns null, which becomes empty string
      expect(result.text).toBe('');
      expect(result.events).toHaveLength(0);
    });
  });

  describe('Thinking Block Extraction', () => {
    it('should extract XML-style thinking blocks', () => {
      const data = '<thinking>Analyzing the problem carefully</thinking>';
      const result = processor.processData('claude', data);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('thinking');

      const thinkingEvent = result.events[0] as ThinkingEvent;
      expect(thinkingEvent.content).toBe('Analyzing the problem carefully');
      expect(result.metadata.hasThinking).toBe(true);
    });

    it('should extract multiple thinking blocks', () => {
      const data = `
        <thinking>First thought</thinking>
        Some text here
        <thinking>Second thought</thinking>
      `;
      const result = processor.processData('claude', data);

      const thinkingEvents = result.events.filter(e => e.type === 'thinking');
      expect(thinkingEvents).toHaveLength(2);

      expect((thinkingEvents[0] as ThinkingEvent).content).toBe('First thought');
      expect((thinkingEvents[1] as ThinkingEvent).content).toBe('Second thought');
    });

    it('should extract markdown-style thinking blocks', () => {
      const data = '```thinking\nAnalyzing the code structure\n```';
      const result = processor.processData('claude', data);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('thinking');

      const thinkingEvent = result.events[0] as ThinkingEvent;
      expect(thinkingEvent.content).toBe('Analyzing the code structure');
    });

    it('should handle multiline thinking blocks', () => {
      const data = `<thinking>
        This is a multiline
        thinking block with
        several lines
      </thinking>`;
      const result = processor.processData('claude', data);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('thinking');

      const thinkingEvent = result.events[0] as ThinkingEvent;
      expect(thinkingEvent.content).toContain('multiline');
      expect(thinkingEvent.content).toContain('several lines');
    });
  });

  describe('Tool Use Extraction', () => {
    it('should extract tool use from JSON format', () => {
      const data = '{"type":"tool_use","name":"read_file","input":{"path":"test.ts"}}';
      const result = processor.processData('claude', data);

      const toolEvents = result.events.filter(e => e.type === 'tool_use');
      expect(toolEvents).toHaveLength(1);

      const toolEvent = toolEvents[0] as ToolUseEvent;
      expect(toolEvent.toolName).toBe('read_file');
      expect(toolEvent.input).toEqual({ path: 'test.ts' });
      expect(result.metadata.hasToolUse).toBe(true);
      expect(result.metadata.toolsUsed).toContain('read_file');
    });

    it('should extract tool use from simple text pattern', () => {
      const data = 'Using tool: Bash';
      const result = processor.processData('claude', data);

      const toolEvents = result.events.filter(e => e.type === 'tool_use');
      expect(toolEvents.length).toBeGreaterThan(0);

      const toolEvent = toolEvents[0] as ToolUseEvent;
      expect(toolEvent.toolName).toBe('Bash');
    });

    it('should extract "Calling function:" pattern', () => {
      const data = 'Calling function: calculateSum';
      const result = processor.processData('claude', data);

      const toolEvents = result.events.filter(e => e.type === 'tool_use');
      expect(toolEvents.length).toBeGreaterThan(0);

      const toolEvent = toolEvents[0] as ToolUseEvent;
      expect(toolEvent.toolName).toBe('calculateSum');
    });

    it('should track multiple unique tools', () => {
      const data = `
        Using tool: Read
        Using tool: Write
        Using tool: Read
      `;
      const result = processor.processData('claude', data);

      expect(result.metadata.hasToolUse).toBe(true);
      expect(result.metadata.toolsUsed).toContain('Read');
      expect(result.metadata.toolsUsed).toContain('Write');
      // Should only have unique tools
      expect(result.metadata.toolsUsed.length).toBe(2);
    });
  });

  describe('Tool Result Extraction', () => {
    it('should extract tool results from JSON format', () => {
      const data = '{"type":"tool_result","tool_use_id":"read_1","content":"File contents here","is_error":false}';
      const result = processor.processData('claude', data);

      const resultEvents = result.events.filter(e => e.type === 'tool_result');
      expect(resultEvents).toHaveLength(1);

      const resultEvent = resultEvents[0] as any;
      expect(resultEvent.toolName).toBe('read_1');
      expect(resultEvent.output).toBe('File contents here');
      expect(resultEvent.isError).toBe(false);
    });

    it('should detect error results', () => {
      const data = '{"type":"tool_result","tool_use_id":"bash_1","content":"Command failed","is_error":true}';
      const result = processor.processData('claude', data);

      const resultEvents = result.events.filter(e => e.type === 'tool_result');
      expect(resultEvents).toHaveLength(1);

      const resultEvent = resultEvents[0] as any;
      expect(resultEvent.isError).toBe(true);
    });
  });

  describe('Metadata Building', () => {
    it('should correctly identify thinking presence', () => {
      const data = '<thinking>Some thought</thinking>';
      const result = processor.processData('claude', data);

      expect(result.metadata.hasThinking).toBe(true);
      expect(result.metadata.hasToolUse).toBe(false);
    });

    it('should correctly identify tool use presence', () => {
      const data = 'Using tool: Bash';
      const result = processor.processData('claude', data);

      expect(result.metadata.hasThinking).toBe(false);
      expect(result.metadata.hasToolUse).toBe(true);
    });

    it('should count events correctly', () => {
      const data = `
        <thinking>First</thinking>
        <thinking>Second</thinking>
        Using tool: Read
      `;
      const result = processor.processData('claude', data);

      expect(result.metadata.eventCount).toBeGreaterThan(2);
    });

    it('should list all unique tools used', () => {
      const data = `
        Using tool: Read
        Using tool: Write
        Using tool: Bash
      `;
      const result = processor.processData('claude', data);

      expect(result.metadata.toolsUsed).toHaveLength(3);
      expect(result.metadata.toolsUsed).toContain('Read');
      expect(result.metadata.toolsUsed).toContain('Write');
      expect(result.metadata.toolsUsed).toContain('Bash');
    });
  });

  describe('Mixed Content', () => {
    it('should extract multiple event types from mixed content', () => {
      const data = `
        <thinking>Planning my approach</thinking>
        Using tool: Read
        Regular text content
      `;
      const result = processor.processData('claude', data);

      const thinkingEvents = result.events.filter(e => e.type === 'thinking');
      const toolEvents = result.events.filter(e => e.type === 'tool_use');

      expect(thinkingEvents).toHaveLength(1);
      expect(toolEvents.length).toBeGreaterThan(0);
      expect(result.metadata.hasThinking).toBe(true);
      expect(result.metadata.hasToolUse).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON gracefully', () => {
      const data = '{"type":"tool_use","name":"invalid}';
      const result = processor.processData('claude', data);

      // Should not throw, should return data as-is
      expect(result.text).toBe(data);
    });

    it('should return minimal stream on processing error', () => {
      // Pass null/undefined - should handle gracefully
      const result = processor.processData('claude', null as any);

      expect(result.text).toBe('');
      expect(result.events).toHaveLength(0);
      expect(result.metadata.eventCount).toBe(0);
    });
  });

  describe('Parser Caching', () => {
    it('should cache parsers for the same agent', () => {
      const result1 = processor.processData('claude', 'test 1');
      const result2 = processor.processData('claude', 'test 2');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should clear parser cache', () => {
      processor.processData('claude', 'test');
      processor.clearCache();

      // Should work fine after cache clear
      const result = processor.processData('claude', 'test again');
      expect(result).toBeDefined();
    });
  });
});
