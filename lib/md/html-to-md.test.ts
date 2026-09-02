import { htmlToMarkdown } from './html-to-md';

describe('htmlToMarkdown', () => {
  it('converts headings with atx syntax', () => {
    expect(htmlToMarkdown('<h1>Hello</h1><p>world</p>')).toContain('# Hello');
    expect(htmlToMarkdown('<h1>Hello</h1><p>world</p>')).toContain('world');
  });

  it('keeps link href and image src', () => {
    const md = htmlToMarkdown(
      '<p><a href="https://ex.com/a">n</a></p><p><img src="https://ex.com/i.png" alt="pic"></p>',
    );
    expect(md).toContain('[n](https://ex.com/a)');
    expect(md).toContain('https://ex.com/i.png');
  });

  it('converts GFM tables', () => {
    const md = htmlToMarkdown(
      '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>',
    );
    expect(md).toMatch(/\|.*A.*\|.*B/);
    expect(md).toContain('1');
    expect(md).toContain('2');
  });

  it('converts lists', () => {
    const md = htmlToMarkdown('<ul><li>one</li><li>two</li></ul>');
    expect(md).toMatch(/[-*]\s+one/);
    expect(md).toMatch(/[-*]\s+two/);
  });
});
