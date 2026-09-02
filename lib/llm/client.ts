import { buildConvertMessages, completionsUrl, modelsUrl } from './prompt';

export type StreamCallbacks = {
  onDelta: (text: string) => void;
  signal?: AbortSignal;
};

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;
};

export function mapHttpError(status: number): string {
  if (status === 401) return '密钥无效，请到设置检查 API Key';
  if (status === 429) return '额度或频率受限，请稍后重试';
  return `接口返回 ${status}，请稍后重试`;
}

async function readSseStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  const pump = async (): Promise<void> => {
    while (true) {
      if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() ?? '';
      for (const chunk of chunks) {
        const line = chunk
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trim())
          .join('');
        if (!line || line === '[DONE]') continue;
        try {
          const json = JSON.parse(line) as {
            choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
          };
          const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
          if (delta) {
            full += delta;
            onDelta(delta);
          }
        } catch {
          /* ignore malformed sse */
        }
      }
    }
  };

  try {
    await pump();
  } finally {
    reader.releaseLock();
  }
  return full;
}

export async function chatCompletions(options: {
  baseURL: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  onDelta?: (text: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const { baseURL, apiKey, model, messages, stream = false, onDelta, signal } = options;
  let res: Response;
  try {
    res = await fetch(completionsUrl(baseURL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream,
      }),
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error('网络错误，请检查网络后重试');
  }

  if (!res.ok) {
    throw new Error(mapHttpError(res.status));
  }

  if (stream && res.body) {
    return readSseStream(res.body, onDelta ?? (() => undefined), signal);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content ?? '';
  if (text && onDelta) onDelta(text);
  return text;
}

export async function probeCompletions(options: {
  baseURL: string;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<void> {
  const { baseURL, apiKey, signal } = options;
  let res: Response;
  try {
    res = await fetch(modelsUrl(baseURL), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new Error('网络错误，请检查网络后重试');
  }
  if (res.status === 404) throw new Error('无法列出模型，请确认 baseURL');
  if (!res.ok) throw new Error(mapHttpError(res.status));
}

export async function convertHtmlToMarkdown(options: {
  html: string;
  baseURL: string;
  apiKey: string;
  model: string;
  taskPrompt?: string;
  onDelta: (text: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const { html, taskPrompt, ...rest } = options;
  return chatCompletions({
    ...rest,
    stream: true,
    messages: buildConvertMessages(html, taskPrompt),
  });
}
