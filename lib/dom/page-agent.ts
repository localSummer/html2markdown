import { detectRegions } from './regions';
import { clearHighlight, highlightElements, highlightRegion } from './highlight';
import { cancelPicker, getPickedElement, startPicker } from './picker';
import type { ExtensionMessage, ExtensionResponse } from '../messages';
import {
  blobToDataUrl,
  FETCH_CONCURRENCY,
  FETCH_TIMEOUT_MS,
  mapPool,
  mergeAbortSignal,
} from '../vision/fetch';
import { VISION_MAX_EDGE } from '../vision/images';

function indexPageImages(): Map<string, HTMLImageElement> {
  const map = new Map<string, HTMLImageElement>();
  for (const img of document.images) {
    if (img.currentSrc) map.set(img.currentSrc, img);
    if (img.src) map.set(img.src, img);
  }
  return map;
}

function dataUrlFromImg(img: HTMLImageElement): string | null {
  if (img.naturalWidth < 1 || img.naturalHeight < 1) return null;
  try {
    const scale = Math.min(1, VISION_MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
}

async function fetchImageDataUrls(urls: string[]): Promise<{ url: string; dataUrl: string }[]> {
  const index = indexPageImages();
  const got: { url: string; dataUrl: string }[] = [];
  const missing: string[] = [];
  for (const url of urls) {
    if (url.startsWith('data:')) {
      got.push({ url, dataUrl: url });
      continue;
    }
    const img = index.get(url);
    const fromDom = img ? dataUrlFromImg(img) : null;
    if (fromDom) got.push({ url, dataUrl: fromDom });
    else missing.push(url);
  }
  if (missing.length === 0) return got;
  const extras = await mapPool(missing, FETCH_CONCURRENCY, async (url) => {
    try {
      const res = await fetch(url, {
        credentials: 'include',
        signal: mergeAbortSignal(undefined, FETCH_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      return { url, dataUrl: await blobToDataUrl(await res.blob()) };
    } catch {
      return null;
    }
  });
  for (const item of extras) {
    if (item) got.push(item);
  }
  return got;
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
