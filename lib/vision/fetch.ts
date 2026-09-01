export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function fetchDataUrl(url: string, signal?: AbortSignal): Promise<string | null> {
  if (url.startsWith('data:')) return url;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

export async function fetchVisionImages(
  urls: string[],
  fallback: (urls: string[]) => Promise<Array<{ url: string; dataUrl: string }>>,
  signal?: AbortSignal,
): Promise<{ images: Array<{ url: string; dataUrl: string }>; fetchFailed: number }> {
  const got = new Map<string, string>();
  const missing: string[] = [];
  for (const url of urls) {
    if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
    const dataUrl = await fetchDataUrl(url, signal);
    if (dataUrl) got.set(url, dataUrl);
    else missing.push(url);
  }
  if (missing.length > 0) {
    const extra = await fallback(missing);
    for (const item of extra) {
      if (item.dataUrl) got.set(item.url, item.dataUrl);
    }
  }
  const images = urls
    .filter((url) => got.has(url))
    .map((url) => ({ url, dataUrl: got.get(url)! }));
  return { images, fetchFailed: urls.length - images.length };
}
