import { convertHtmlToMarkdown } from '../llm/client';
import { buildConvertMessages } from '../llm/prompt';
import { noteFormat } from './templates';

describe('note conversion request', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([undefined, noteFormat('comparison')])('passes optional format only into prompts, using the existing request API', async (format) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: {"choices":[{"delta":{"content":"# 笔记"}}]}\n\ndata: [DONE]\n\n'));
    vi.stubGlobal('fetch', fetchMock);
    const onDelta = vi.fn();
    const result = await convertHtmlToMarkdown({
      html: '<p>资料</p>', taskPrompt: '详细', noteFormat: format,
      baseURL: 'https://example.com/v1', apiKey: 'test-key', model: 'test-model', onDelta,
    });
    expect(result).toBe('# 笔记');
    expect(onDelta).toHaveBeenCalledWith('# 笔记');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe('https://example.com/v1/chat/completions');
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({
      model: 'test-model', stream: true, messages: buildConvertMessages('<p>资料</p>', '详细', format),
    });
  });
});
