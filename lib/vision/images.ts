import type { ImageMeta } from '../messages';

const MIN_SIZE = 64;

export function isDecorative(image: ImageMeta): boolean {
  if (image.role === 'presentation' || image.role === 'none') return true;
  const w = image.width;
  const h = image.height;
  if (w > 0 && h > 0 && (w <= 1 || h <= 1)) return true;
  if (w > 0 && h > 0 && w < MIN_SIZE && h < MIN_SIZE) return true;
  return false;
}

export function formatVisionHint(total: number, decorative: number, max: number): string {
  const useful = Math.max(0, total - decorative);
  const selected = Math.min(useful, max);
  const truncated = Math.max(0, useful - selected);
  const parts = [`将识别 ${selected} 张`];
  if (decorative) parts.push(`已跳过 ${decorative} 张装饰图`);
  if (truncated) parts.push(`${truncated} 张超出上限未识别`);
  return parts.join('，');
}

export function selectVisionImages(
  images: ImageMeta[],
  max: number,
): { selected: ImageMeta[]; skipped: number; truncated: number } {
  const useful = images.filter((img) => !isDecorative(img));
  const skipped = images.length - useful.length;
  const selected = useful.slice(0, max);
  const truncated = Math.max(0, useful.length - selected.length);
  return { selected, skipped, truncated };
}

export function insertCaptions(
  markdown: string,
  captions: Array<{ url: string; text: string }>,
): string {
  let out = markdown;
  for (const { url, text } of captions) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(!\\[[^\\]]*\\]\\(${escaped}\\))`);
    if (!re.test(out)) continue;
    const block = formatCaptionBlock(text);
    if (!block) continue;
    out = out.replace(re, `$1\n\n${block}`);
  }
  return out;
}

export function formatCaptionBlock(text: string): string {
  const lines = text
    .replace(/\r\n/g, '\n')
    .trim()
    .split('\n')
    .map((line) => line.trimEnd());
  while (lines[0] === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  if (lines.length === 0) return '';
  return lines
    .map((line, i) => {
      if (i === 0) return line ? `> 图：${line}` : '> 图：';
      return line ? `> ${line}` : '>';
    })
    .join('\n');
}

export async function compressDataUrl(dataUrl: string, maxEdge = 1280, quality = 0.82): Promise<string> {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return dataUrl;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
