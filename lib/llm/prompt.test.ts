import { SYSTEM_PROMPT, TASK_SYSTEM_PROMPT, VISION_IMAGE_PROMPT, assertWithinLimit, buildConvertMessages, completionsUrl, modelsUrl } from './prompt';

describe('assertWithinLimit', () => {
  it('allows content under the cap', () => {
    expect(() => assertWithinLimit('hello', 10)).not.toThrow();
  });

  it('rejects oversized html', () => {
    expect(() => assertWithinLimit('x'.repeat(12), 10)).toThrow(/超出 AI 输入上限/);
  });

  it('skips the check when limit is 0', () => {
    expect(() => assertWithinLimit('x'.repeat(100), 0)).not.toThrow();
  });
});

describe('completionsUrl', () => {
  it('appends chat/completions to /v1', () => {
    expect(completionsUrl('https://api.deepseek.com/v1')).toBe(
      'https://api.deepseek.com/v1/chat/completions',
    );
  });

  it('does not duplicate the path', () => {
    expect(completionsUrl('https://api.deepseek.com/v1/chat/completions/')).toBe(
      'https://api.deepseek.com/v1/chat/completions',
    );
  });
});

describe('modelsUrl', () => {
  it('appends models to /v1', () => {
    expect(modelsUrl('https://api.deepseek.com/v1')).toBe('https://api.deepseek.com/v1/models');
  });

  it('rewrites chat/completions to models', () => {
    expect(modelsUrl('https://api.deepseek.com/v1/chat/completions/')).toBe(
      'https://api.deepseek.com/v1/models',
    );
  });
});

describe('VISION_IMAGE_PROMPT', () => {
  it('asks for structure and content instead of a short summary', () => {
    expect(VISION_IMAGE_PROMPT).toContain('结构');
    expect(VISION_IMAGE_PROMPT).toContain('内容');
    expect(VISION_IMAGE_PROMPT).toContain('不是写摘要');
    expect(VISION_IMAGE_PROMPT).toContain('不要压缩');
  });
});

describe('SYSTEM_PROMPT', () => {
  it('forbids wrapping the whole document in a markdown fence', () => {
    expect(SYSTEM_PROMPT).toContain('不要用');
    expect(SYSTEM_PROMPT).toContain('markdown');
    expect(SYSTEM_PROMPT).toContain('不要编造');
    expect(SYSTEM_PROMPT).toContain('GFM');
  });
});

describe('buildConvertMessages', () => {
  it('uses the default system prompt when task is empty', () => {
    const msgs = buildConvertMessages('<p>hi</p>', '  ');
    expect(msgs).toEqual([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: '<p>hi</p>' },
    ]);
  });

  it('puts a custom task in front of the html', () => {
    const msgs = buildConvertMessages('<p>hi</p>', '用三条要点总结');
    expect(msgs[0]).toEqual({ role: 'system', content: TASK_SYSTEM_PROMPT });
    expect(msgs[1]?.content).toContain('用三条要点总结');
    expect(msgs[1]?.content).toContain('<p>hi</p>');
  });
});
