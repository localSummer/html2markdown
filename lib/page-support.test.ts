import { getUnsupportedReason } from './page-support';

describe('getUnsupportedReason', () => {
  it('allows http(s) pages', () => {
    expect(getUnsupportedReason('https://example.com/post')).toBeNull();
    expect(getUnsupportedReason('http://localhost:3000')).toBeNull();
  });

  it('rejects chrome and store pages', () => {
    expect(getUnsupportedReason('chrome://extensions')).toContain('chrome://');
    expect(getUnsupportedReason('https://chromewebstore.google.com/detail/x')).toContain('应用店');
    expect(getUnsupportedReason('file:///tmp/a.html')).toContain('本地文件');
    expect(getUnsupportedReason('https://cdn.example.com/doc.pdf')).toContain('PDF');
  });
});
