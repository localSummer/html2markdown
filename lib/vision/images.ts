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

type ImageSlot = { start: number; end: number; url: string };

function decodeEntities(value: string): string {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function normalizeUrl(url: string): string {
  const raw = decodeEntities(url.trim());
  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${decodeURIComponent(parsed.pathname)}`.replace(/\/$/, '');
  } catch {
    try {
      return decodeURIComponent(raw).replace(/\/$/, '');
    } catch {
      return raw.replace(/\/$/, '');
    }
  }
}

function sameImageUrl(a: string, b: string): boolean {
  if (a === b) return true;
  const na = normalizeUrl(a);
  const nb = normalizeUrl(b);
  if (na === nb) return true;
  try {
    const path = new URL(a).pathname;
    if (path.length > 1 && (b.includes(path) || decodeEntities(b).includes(path))) return true;
  } catch {
    /* ignore */
  }
  try {
    const path = new URL(b).pathname;
    if (path.length > 1 && (a.includes(path) || decodeEntities(a).includes(path))) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function collectImageSlots(markdown: string): ImageSlot[] {
  const slots: ImageSlot[] = [];
  const mdRe = /!\[([^\]]*)\]\((?:<)?([^)\s>]+)(?:>)?(?:\s+"[^"]*")?\)/g;
  let match: RegExpExecArray | null;
  while ((match = mdRe.exec(markdown))) {
    slots.push({ start: match.index, end: match.index + match[0].length, url: match[2] });
  }
  const htmlRe = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\/?>/gi;
  while ((match = htmlRe.exec(markdown))) {
    slots.push({ start: match.index, end: match.index + match[0].length, url: match[1] });
  }
  slots.sort((a, b) => a.start - b.start);
  return slots;
}

export function insertCaptions(
  markdown: string,
  captions: Array<{ url: string; text: string }>,
): string {
  const slots = collectImageSlots(markdown);
  const used = new Set<number>();
  const insertions: Array<{ at: number; block: string }> = [];
  const leftovers: string[] = [];

  for (const { url, text } of captions) {
    const block = formatCaptionBlock(text);
    if (!block) continue;
    let idx = slots.findIndex((slot, i) => !used.has(i) && sameImageUrl(slot.url, url));
    if (idx < 0) idx = slots.findIndex((_, i) => !used.has(i));
    if (idx < 0) {
      leftovers.push(block);
      continue;
    }
    used.add(idx);
    insertions.push({ at: slots[idx].end, block });
  }

  insertions.sort((a, b) => b.at - a.at);
  let out = markdown;
  for (const { at, block } of insertions) {
    out = `${out.slice(0, at)}\n\n${block}${out.slice(at)}`;
  }
  if (leftovers.length === 0) return out;
  return `${out.replace(/\s*$/, '')}\n\n${leftovers.join('\n\n')}\n`;
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
