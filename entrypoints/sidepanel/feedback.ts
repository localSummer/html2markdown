import { toast } from 'sonner';
import { copyText, downloadMarkdown } from '../../lib/export';

export async function copyWithFeedback(text: string): Promise<void> {
  try {
    await copyText(text);
    toast.success('已复制');
  } catch {
    toast.error('复制失败');
  }
}

export function downloadWithFeedback(text: string, title: string): void {
  try {
    downloadMarkdown(text, title);
    toast.success('已开始下载');
  } catch {
    toast.error('下载失败');
  }
}
