import { extractElement } from './extract';

describe('extractElement', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('serializes the picked node without readability', () => {
    document.body.innerHTML =
      '<article id="pick"><p>指定区域正文</p><img src="https://ex.com/a.png" alt=""></article>';
    const el = document.getElementById('pick');
    expect(el).toBeTruthy();
    const res = extractElement(el!, 'https://ex.com/');
    expect(res.ok).toBe(true);
    expect(res.html).toContain('指定区域正文');
    expect(res.images.map((i) => i.src)).toEqual(['https://ex.com/a.png']);
    expect(res.useReadability).toBeUndefined();
  });
});
