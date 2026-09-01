import { cleanClone } from './denoise';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('cleanClone', () => {
  it('strips script, class and style attributes', () => {
    const doc = parse(`
      <article class="post" id="x" data-id="1" style="color:red">
        <script>alert(1)</script>
        <p class="lead">Hello <b>world</b></p>
        <img src="/a.png" alt="pic" class="hero">
      </article>
    `);
    const html = cleanClone(doc.body, 'https://example.com/page');
    expect(html).not.toContain('script');
    expect(html).not.toContain('class=');
    expect(html).not.toContain('style=');
    expect(html).not.toContain('data-id');
    expect(html).toContain('<p>Hello <b>world</b></p>');
    expect(html).toContain('src="https://example.com/a.png"');
    expect(html).toContain('alt="pic"');
  });

  it('turns iframe into a link', () => {
    const doc = parse(`<p>x</p><iframe src="https://example.com/embed"></iframe>`);
    const html = cleanClone(doc.body, 'https://example.com/');
    expect(html).toContain('href="https://example.com/embed"');
    expect(html).not.toContain('<iframe');
  });

  it('keeps nav when keepNav is true', () => {
    const doc = parse(`<nav><a href="/home">Home</a></nav><p>body</p>`);
    const html = cleanClone(doc.body, 'https://example.com/', true);
    expect(html).toContain('<nav>');
    expect(html).toContain('Home');
  });
});
