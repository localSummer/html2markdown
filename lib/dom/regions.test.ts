import { detectRegions, findMainElement, liveRootsFor } from './regions';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

const LONG_TEXT = '正文段落内容。'.repeat(20);

describe('findMainElement', () => {
  it('prefers semantic article/main elements', () => {
    const doc = parse(`<div><article><p>${LONG_TEXT}</p></article></div>`);
    expect(findMainElement(doc).tagName).toBe('ARTICLE');
  });

  it('picks densest content div over page wrapper with heavy nav links', () => {
    const links = Array.from({ length: 10 }, (_, i) => `<a href="/t${i}">导航链接 ${i} 文字</a>`).join('');
    const doc = parse(`
      <div id="shell">
        <nav>${links}</nav>
        <div id="content"><p>${LONG_TEXT}</p><p>${LONG_TEXT}</p></div>
      </div>
    `);
    expect(findMainElement(doc).id).toBe('content');
  });

  it('falls back to body when no candidate has enough text', () => {
    const doc = parse(`<div><p>hi</p></div>`);
    expect(findMainElement(doc).tagName).toBe('BODY');
  });
});

describe('detectRegions', () => {
  it('omits full when main covers nearly the whole page', () => {
    const doc = parse(`<main><p>${LONG_TEXT}</p></main>`);
    const regions = detectRegions(doc);
    expect(regions.map((r) => r.id)).toEqual(['main']);
  });

  it('keeps full when main is clearly smaller than the page', () => {
    const doc = parse(`
      <header>${'页头杂项。'.repeat(30)}</header>
      <article><p>${LONG_TEXT}</p></article>
      <footer>${'页脚杂项。'.repeat(30)}</footer>
    `);
    const regions = detectRegions(doc);
    expect(regions.map((r) => r.id)).toContain('full');
  });

  it('adds nav options only when nav exists', () => {
    const doc = parse(`
      <nav><a href="/">Home</a> <a href="/about">About</a> <a href="/archive">Archive</a></nav>
      <article><p>${LONG_TEXT}</p></article>
      <footer>${'页脚杂项。'.repeat(40)}</footer>
    `);
    const regions = detectRegions(doc);
    expect(regions.map((r) => r.id)).toEqual(['main', 'nav', 'main_nav', 'full']);
  });

  it('skips nav options when navs carry no text', () => {
    const doc = parse(`
      <nav></nav>
      <article><p>${LONG_TEXT}</p></article>
      <footer>${'页脚杂项。'.repeat(40)}</footer>
    `);
    const regions = detectRegions(doc);
    expect(regions.map((r) => r.id)).toEqual(['main', 'full']);
  });

  it('merges main_nav into main when nav adds negligible text', () => {
    const doc = parse(`
      <nav><a href="/">•</a></nav>
      <article><p>${LONG_TEXT}</p></article>
      <footer>${'页脚杂项。'.repeat(40)}</footer>
    `);
    const regions = detectRegions(doc);
    expect(regions.map((r) => r.id)).toEqual(['main', 'nav', 'full']);
  });

  it('returns empty when body has no text', () => {
    const doc = parse(`<div></div>`);
    expect(detectRegions(doc)).toEqual([]);
  });
});

describe('liveRootsFor', () => {
  it('returns no roots for a custom pick', () => {
    const doc = parse(`<article><p>${LONG_TEXT}</p></article>`);
    expect(liveRootsFor(doc, 'custom')).toEqual([]);
  });
});
