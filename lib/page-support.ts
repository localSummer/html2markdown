export function getUnsupportedReason(url: string | undefined): string | null {
  if (!url) return '无法读取当前标签页';
  if (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools:')
  ) {
    return '当前页不是普通网页（如 chrome://），无法转换';
  }
  if (url.startsWith('https://chrome.google.com/webstore') || url.startsWith('https://chromewebstore.google.com')) {
    return 'Chrome 网上应用店页面无法注入脚本';
  }
  if (url.startsWith('view-source:')) return '不支持 view-source 页面';
  if (url.startsWith('file:')) return '第一版不支持本地文件页面';
  if (/\.pdf($|\?)/i.test(url)) return '不支持 Chrome 内置 PDF 查看器';
  if (url.startsWith('https://') || url.startsWith('http://')) return null;
  return '仅支持 http/https 网页';
}
