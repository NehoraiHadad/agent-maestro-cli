import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { StreamRenderer } from '../../src/features/ui/StreamRenderer.js';
import type {
  ThinkingEvent,
  ToolUseEvent,
  ToolResultEvent,
  TextEvent
} from '../../src/shared/types/streaming.types.js';

describe('StreamRenderer', () => {
  let renderer: StreamRenderer;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    renderer = new StreamRenderer();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = renderer.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.showThinking).toBe(true);
      expect(config.showToolUse).toBe(true);
      expect(config.showProgress).toBe(true);
      expect(config.indentSize).toBe(2);
    });

    it('should accept custom configuration', () => {
      const customRenderer = new StreamRenderer({
        enabled: false,
        indentSize: 4
      });

      const config = customRenderer.getConfig();
      expect(config.enabled).toBe(false);
      expect(config.indentSize).toBe(4);
    });

    it('should update configuration', () => {
      renderer.updateConfig({ showThinking: false });

      const config = renderer.getConfig();
      expect(config.showThinking).toBe(false);
    });
  });

  describe('Thinking Rendering', () => {
    it('should render thinking blocks', () => {
      renderer.renderThinking('This is a thought');

      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('should not render when disabled', () => {
      renderer.updateConfig({ showThinking: false });
      renderer.renderThinking('This should not show');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should truncate long thinking blocks', () => {
      const longText = 'a'.repeat(500);
      renderer.updateConfig({ maxThinkingLength: 100 });
      renderer.renderThinking(longText);

      expect(consoleSpy).toHaveBeenCalled();
      // Content should be truncated
      const output = consoleSpy.mock.calls.join('');
      expect(output).toContain('...');
    });

    it('should not truncate when maxThinkingLength is undefined', () => {
      renderer.updateConfig({ maxThinkingLength: undefined });
      const text = 'a'.repeat(500);
      renderer.renderThinking(text);

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Tool Use Rendering', () => {
    it('should render tool use events', () => {
      renderer.renderToolUse('Read', { file_path: '/test.ts' });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.join('');
      expect(output).toContain('Read');
    });

    it('should render tool use with empty args', () => {
      renderer.renderToolUse('Bash', {});

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.join('');
      expect(output).toContain('Bash');
    });

    it('should not render when disabled', () => {
      renderer.updateConfig({ showToolUse: false });
      renderer.renderToolUse('Read', {});

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should format complex arguments', () => {
      renderer.renderToolUse('ComplexTool', {
        nested: { key: 'value' },
        array: [1, 2, 3]
      });

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Tool Result Rendering', () => {
    it('should render successful tool results', () => {
      renderer.renderToolResult('Read', 'File contents', false);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.join('');
      expect(output).toContain('Read');
      expect(output).toContain('File contents');
    });

    it('should render error tool results', () => {
      renderer.renderToolResult('Bash', 'Command failed', true);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.join('');
      expect(output).toContain('Bash');
      expect(output).toContain('Command failed');
    });

    it('should not render when disabled', () => {
      renderer.updateConfig({ showToolUse: false });
      renderer.renderToolResult('Read', 'output', false);

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Progress Rendering', () => {
    let stdoutSpy: jest.SpiedFunction<typeof process.stdout.write>;

    beforeEach(() => {
      stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    });

    afterEach(() => {
      stdoutSpy.mockRestore();
    });

    it('should render progress bar', () => {
      renderer.renderProgress(50, 'Loading');

      expect(stdoutSpy).toHaveBeenCalled();
      const output = stdoutSpy.mock.calls.join('');
      expect(output).toContain('Loading');
      expect(output).toContain('50%');
    });

    it('should not render when disabled', () => {
      renderer.updateConfig({ showProgress: false });
      renderer.renderProgress(50, 'Loading');

      expect(stdoutSpy).not.toHaveBeenCalled();
    });

    it('should add newline when complete', () => {
      renderer.renderProgress(100, 'Complete');

      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should clamp percentage to 0-100 range', () => {
      renderer.renderProgress(150, 'Over');
      renderer.renderProgress(-10, 'Under');

      expect(stdoutSpy).toHaveBeenCalled();
    });
  });

  describe('Event Rendering', () => {
    it('should render thinking events', () => {
      const event: ThinkingEvent = {
        type: 'thinking',
        content: 'Analyzing',
        timestamp: Date.now()
      };

      renderer.renderEvent(event);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should render tool use events', () => {
      const event: ToolUseEvent = {
        type: 'tool_use',
        toolName: 'Read',
        input: { path: '/test.ts' },
        timestamp: Date.now()
      };

      renderer.renderEvent(event);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should render tool result events', () => {
      const event: ToolResultEvent = {
        type: 'tool_result',
        toolName: 'Read',
        output: 'Success',
        isError: false,
        timestamp: Date.now()
      };

      renderer.renderEvent(event);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should render text events', () => {
      const event: TextEvent = {
        type: 'text',
        content: 'Plain text',
        timestamp: Date.now()
      };

      renderer.renderEvent(event);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should render multiple events', () => {
      const events: (ThinkingEvent | TextEvent)[] = [
        {
          type: 'thinking',
          content: 'First thought',
          timestamp: Date.now()
        },
        {
          type: 'text',
          content: 'Some text',
          timestamp: Date.now()
        }
      ];

      renderer.renderEvents(events);
      expect(consoleSpy.mock.calls.length).toBeGreaterThan(0);
    });
  });

  describe('Text Rendering', () => {
    it('should render plain text', () => {
      renderer.renderText('Hello, world!');

      expect(consoleSpy).toHaveBeenCalledWith('Hello, world!');
    });

    it('should not render empty text', () => {
      renderer.renderText('   ');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should not render when disabled', () => {
      renderer.updateConfig({ enabled: false });
      renderer.renderText('Text');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    beforeEach(() => {
      renderer.updateConfig({ enabled: false });
    });

    it('should not render anything when disabled', () => {
      renderer.renderThinking('test');
      renderer.renderToolUse('tool', {});
      renderer.renderToolResult('tool', 'output', false);
      renderer.renderText('text');

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});
