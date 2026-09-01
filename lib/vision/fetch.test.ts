import { fetchVisionImages } from './fetch';

describe('fetchVisionImages', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses data urls then page fallback, preserving url order', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('blocked');
      }),
    );
    const { images, fetchFailed } = await fetchVisionImages(
      ['data:image/png;base64,ok', 'https://cdn.example.com/cookie.png'],
      async () => [{ url: 'https://cdn.example.com/cookie.png', dataUrl: 'data:image/png;base64,xx' }],
    );
    expect(images.map((item) => item.url)).toEqual([
      'data:image/png;base64,ok',
      'https://cdn.example.com/cookie.png',
    ]);
    expect(fetchFailed).toBe(0);
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
});
