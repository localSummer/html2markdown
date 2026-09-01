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
