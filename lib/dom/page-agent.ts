import { detectRegions } from './regions';
import { clearHighlight, highlightRegion } from './highlight';
import type { ExtensionMessage, ExtensionResponse } from '../messages';

async function fetchImageDataUrls(urls: string[]): Promise<{ url: string; dataUrl: string }[]> {
  const out: { url: string; dataUrl: string }[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      out.push({ url, dataUrl });
    } catch {
      /* skip */
    }
  }
  return out;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function handlePageMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'PING':
      return { ok: true };
    case 'SCAN': {
      const regions = detectRegions(document);
      if (regions.length === 0) {
        return { ok: false, error: '当前页没有可提取的文本，请等待加载完成后重新扫描' };
      }
      return {
        ok: true,
        title: document.title,
        url: location.href,
        regions,
      };
    }
    case 'HIGHLIGHT':
      highlightRegion(message.region);
      return { ok: true };
    case 'CLEAR_HIGHLIGHT':
      clearHighlight();
      return { ok: true };
    case 'EXTRACT': {
      const { extractRegion } = await import('./extract');
      return extractRegion(message.region, location.href);
    }
    case 'FETCH_IMAGES':
      return { ok: true, images: await fetchImageDataUrls(message.urls) };
    default:
      return { ok: false, error: '未知消息' };
  }
}
