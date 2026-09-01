import { Readability } from '@mozilla/readability';
import { serializeClean } from './denoise';

export function refineReadableHtml(cleanedHtml: string, baseUrl = 'https://example.invalid/'): string {
  const doc = new DOMParser().parseFromString(
    `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${cleanedHtml}</body></html>`,
    'text/html',
  );
  const parsed = new Readability(doc).parse();
  if (!parsed?.content) return cleanedHtml;
  const wrap = document.implementation.createHTMLDocument('');
  wrap.body.innerHTML = parsed.content;
  const refined = serializeClean(wrap.body, baseUrl);
  return refined || cleanedHtml;
}
