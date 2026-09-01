import { sanitizeFilename } from './export';

describe('sanitizeFilename', () => {
  it('strips illegal characters and adds .md', () => {
    expect(sanitizeFilename('a/b:c*.md?')).toBe('a b c.md');
  });

  it('falls back when title is empty', () => {
    expect(sanitizeFilename('   ')).toBe('page.md');
  });
});
