import { FETCH_CONCURRENCY, fetchVisionImages, mapPool } from './fetch';

describe('mapPool', () => {
  it('preserves order and caps inflight workers', async () => {
    let inflight = 0;
    let maxInflight = 0;
    const result = await mapPool([1, 2, 3, 4, 5], 2, async (n) => {
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      await new Promise((resolve) => setTimeout(resolve, 20));
      inflight -= 1;
      return n * 2;
    });
    expect(result).toEqual([2, 4, 6, 8, 10]);
    expect(maxInflight).toBe(2);
  });
});

describe('fetchVisionImages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads from the page before downloading', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const fromPage = vi.fn(async (urls: string[]) =>
      urls.map((url) => ({ url, dataUrl: `data:image/png;base64,${url}` })),
    );
    const { images, fetchFailed } = await fetchVisionImages(
      ['https://cdn.example.com/a.png', 'https://cdn.example.com/b.png'],
      fromPage,
    );
    expect(fromPage).toHaveBeenCalledWith([
      'https://cdn.example.com/a.png',
      'https://cdn.example.com/b.png',
    ]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(images).toHaveLength(2);
    expect(fetchFailed).toBe(0);
  });

  it('uses data urls then page images, preserving url order', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { images, fetchFailed } = await fetchVisionImages(
      ['data:image/png;base64,ok', 'https://cdn.example.com/cookie.png'],
      async () => [{ url: 'https://cdn.example.com/cookie.png', dataUrl: 'data:image/png;base64,xx' }],
    );
    expect(images.map((item) => item.url)).toEqual([
      'data:image/png;base64,ok',
      'https://cdn.example.com/cookie.png',
    ]);
    expect(fetchFailed).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('counts urls that neither context could load', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('blocked');
      }),
    );
    const { images, fetchFailed } = await fetchVisionImages(
      ['https://cdn.example.com/a.png', 'https://cdn.example.com/b.png'],
      async () => [],
    );
    expect(images).toEqual([]);
    expect(fetchFailed).toBe(2);
  });

  it('downloads remaining urls after the page misses some', async () => {
    expect(FETCH_CONCURRENCY).toBeGreaterThan(1);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('blocked');
      }),
    );
    const { images, fetchFailed } = await fetchVisionImages(
      ['https://cdn.example.com/page.png', 'https://cdn.example.com/miss.png'],
      async (urls) =>
        urls
          .filter((url) => url.endsWith('page.png'))
          .map((url) => ({ url, dataUrl: 'data:image/png;base64,page' })),
    );
    expect(images.map((item) => item.url)).toEqual(['https://cdn.example.com/page.png']);
    expect(fetchFailed).toBe(1);
  });
});
