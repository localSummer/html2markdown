import { formatCaptionBlock, formatVisionHint, insertCaptions, isDecorative, selectVisionImages } from './images';
import type { ImageMeta } from '../messages';

const img = (over: Partial<ImageMeta> = {}): ImageMeta => ({
  src: 'https://example.com/a.png',
  alt: '',
  width: 400,
  height: 300,
  role: null,
  ...over,
});

describe('isDecorative', () => {
  it('skips tiny and presentation images', () => {
    expect(isDecorative(img({ width: 16, height: 16 }))).toBe(true);
    expect(isDecorative(img({ width: 1, height: 1 }))).toBe(true);
    expect(isDecorative(img({ role: 'presentation' }))).toBe(true);
    expect(isDecorative(img())).toBe(false);
  });
});

describe('formatVisionHint', () => {
  it('summarizes selected, skipped and truncated counts', () => {
    expect(formatVisionHint(5, 1, 2)).toBe('将识别 2 张，已跳过 1 张装饰图，2 张超出上限未识别');
  });
});
describe('selectVisionImages', () => {
  it('filters decorative then applies cap', () => {
    const images = [
      img({ src: 'https://example.com/icon.png', width: 12, height: 12 }),
      img({ src: 'https://example.com/1.png' }),
      img({ src: 'https://example.com/2.png' }),
      img({ src: 'https://example.com/3.png' }),
    ];
    const { selected, skipped, truncated } = selectVisionImages(images, 2);
    expect(skipped).toBe(1);
    expect(truncated).toBe(1);
    expect(selected.map((i) => i.src)).toEqual([
      'https://example.com/1.png',
      'https://example.com/2.png',
    ]);
  });
});

describe('insertCaptions', () => {
  it('appends a blockquote after the matching image', () => {
    const md = 'Hello\n\n![alt](https://example.com/a.png)\n\nTail';
    const out = insertCaptions(md, [{ url: 'https://example.com/a.png', text: '  一只猫  ' }]);
    expect(out).toContain('![alt](https://example.com/a.png)\n\n> 图：一只猫');
  });

  it('keeps multi-line structure in the caption blockquote', () => {
    const md = '![alt](https://example.com/a.png)';
    const out = insertCaptions(md, [
      {
        url: 'https://example.com/a.png',
        text: '架构图，分三层。\n\n- 上层：网关\n- 下层：数据库',
      },
    ]);
    expect(out).toBe(
      '![alt](https://example.com/a.png)\n\n> 图：架构图，分三层。\n>\n> - 上层：网关\n> - 下层：数据库',
    );
  });
});

describe('formatCaptionBlock', () => {
  it('returns empty for blank text', () => {
    expect(formatCaptionBlock('  \n  ')).toBe('');
  });
});
