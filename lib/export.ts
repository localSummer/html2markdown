function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatLocalStamp(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function withSourceMeta(
  markdown: string,
  meta: { title?: string; url?: string; createdAt?: number },
): string {
  const lines: string[] = [];
  const title = meta.title?.trim();
  const url = meta.url?.trim();
  if (title) lines.push(`> 标题：${title}`);
  if (url) lines.push(`> 来源：${url}`);
  lines.push(`> 时间：${formatLocalStamp(meta.createdAt ?? Date.now())}`);
  return `${lines.join('\n')}\n\n${markdown}`;
}

export function sanitizeFilename(title: string): string {
  const base =
    title
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.md$/i, '')
      .trim() || 'page';
  return `${base.slice(0, 80)}.md`;
}

export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

export function downloadMarkdown(text: string, title: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFilename(title);
  a.click();
  URL.revokeObjectURL(url);
}
