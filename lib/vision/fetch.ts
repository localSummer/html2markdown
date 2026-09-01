export const FETCH_TIMEOUT_MS = 8_000;
export const FETCH_CONCURRENCY = 4;

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function mergeAbortSignal(signal: AbortSignal | undefined, timeoutMs = FETCH_TIMEOUT_MS): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!signal) return timeout;
  return AbortSignal.any([signal, timeout]);
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  if (items.length === 0) return [];
  const out: R[] = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (true) {
      if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
      const index = next;
      next += 1;
      if (index >= items.length) return;
      const item = items[index] as T;
      out[index] = await worker(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, () => run()));
  return out;
}

export async function fetchDataUrl(url: string, signal?: AbortSignal): Promise<string | null> {
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { signal: mergeAbortSignal(signal) });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && signal?.aborted) throw err;
    return null;
  }
}

export async function fetchVisionImages(
  urls: string[],
  fromPage: (urls: string[]) => Promise<Array<{ url: string; dataUrl: string }>>,
  signal?: AbortSignal,
): Promise<{ images: Array<{ url: string; dataUrl: string }>; fetchFailed: number }> {
  const got = new Map<string, string>();
  for (const url of urls) {
    if (url.startsWith('data:')) got.set(url, url);
  }

  const needPage = urls.filter((url) => !got.has(url));
  if (needPage.length > 0) {
    if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
    const extra = await fromPage(needPage);
    for (const item of extra) {
      if (item.dataUrl) got.set(item.url, item.dataUrl);
    }
  }

  const needNet = urls.filter((url) => !got.has(url));
  if (needNet.length > 0) {
    const fetched = await mapPool(needNet, FETCH_CONCURRENCY, (url) => fetchDataUrl(url, signal), signal);
    for (let i = 0; i < needNet.length; i += 1) {
      const dataUrl = fetched[i];
      const url = needNet[i];
      if (dataUrl && url) got.set(url, dataUrl);
    }
  }

  const images = urls
    .filter((url) => got.has(url))
    .map((url) => ({ url, dataUrl: got.get(url)! }));
  return { images, fetchFailed: urls.length - images.length };
}
