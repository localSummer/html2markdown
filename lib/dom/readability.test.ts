import { refineReadableHtml } from './readability';

const paragraph = 'This is substantial article text that should survive readability extraction. '.repeat(20);

describe('refineReadableHtml', () => {
  it('keeps the article body and drops nav chrome', () => {
    const html = `
      <nav><a href="/">Home</a><a href="/about">About</a></nav>
      <article>
        <h1>Unique Article Title</h1>
        <p>${paragraph}</p>
      </article>
      <aside>Buy now advertisement sidebar junk</aside>
    `;
    const out = refineReadableHtml(html);
    expect(out).toContain('Unique Article Title');
    expect(out).toContain('substantial article text');
    expect(out.toLowerCase()).not.toContain('buy now advertisement');
  });
});
