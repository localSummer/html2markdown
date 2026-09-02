import { sanitizeFilename, withSourceMeta } from './export';

describe('withSourceMeta', () => {
  it('prepends title, url and time without rewriting the body', () => {
    const body = '# Hello\n\nworld';
    const out = withSourceMeta(body, {
      title: 'Page',
      url: 'https://ex.com/a',
      createdAt: Date.UTC(2026, 8, 2, 6, 30),
    });
    expect(out.startsWith('> 标题：Page\n> 来源：https://ex.com/a\n> 时间：')).toBe(true);
    expect(out.endsWith(body)).toBe(true);
  });

  it('omits empty title and url', () => {
    const out = withSourceMeta('body', { title: '  ', url: '', createdAt: 0 });
    expect(out).not.toContain('标题：');
    expect(out).not.toContain('来源：');
    expect(out).toContain('> 时间：');
    expect(out.endsWith('\n\nbody')).toBe(true);
  });
});

describe('sanitizeFilename', () => {
  it('strips illegal characters and adds .md', () => {
    expect(sanitizeFilename('a/b:c*.md?')).toBe('a b c.md');
  });

  it('falls back when title is empty', () => {
    expect(sanitizeFilename('   ')).toBe('page.md');
  });
});
