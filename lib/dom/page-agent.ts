import { detectRegions } from './regions';
import { clearHighlight, highlightElements, highlightRegion } from './highlight';
import { cancelPicker, getPickedElement, startPicker } from './picker';
import type { ExtensionMessage, ExtensionResponse } from '../messages';
import { blobToDataUrl } from '../vision/fetch';

async function dataUrlFromImgElement(url: string): Promise<string | null> {
  const img = Array.from(document.images).find((el) => el.currentSrc === url || el.src === url);
  if (!img || img.naturalWidth < 1 || img.naturalHeight < 1) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return null;
  }
}

async function fetchImageDataUrls(urls: string[]): Promise<{ url: string; dataUrl: string }[]> {
  const out: { url: string; dataUrl: string }[] = [];
  for (const url of urls) {
    const fromDom = await dataUrlFromImgElement(url);
    if (fromDom) {
      out.push({ url, dataUrl: fromDom });
      continue;
    }
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) continue;
      const blob = await res.blob();
      out.push({ url, dataUrl: await blobToDataUrl(blob) });
    } catch {
      /* skip */
    }
  }
  return out;
}

export async function handlePageMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
  switch (message.type) {
    case 'PING':
      return { ok: true };
    case 'SCAN': {
      cancelPicker({ forget: true });
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
      if (message.region === 'custom') {
        const el = getPickedElement();
        if (el) highlightElements([el]);
        else clearHighlight();
      } else {
        highlightRegion(message.region);
      }
      return { ok: true };
    case 'CLEAR_HIGHLIGHT':
      cancelPicker();
      clearHighlight();
      return { ok: true };
    case 'PICK_START':
      return startPicker();
    case 'PICK_CANCEL':
      cancelPicker({ forget: Boolean(message.forget) });
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
