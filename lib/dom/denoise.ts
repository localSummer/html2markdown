const JUNK_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'LINK', 'META']);

const COOKIE_SELECTORS = [
  '#onetrust-banner-sdk',
  '#onetrust-consent-sdk',
  '.cc-window',
  '[id*="cookie-banner" i]',
  '[class*="cookie-banner" i]',
];

const ALLOWED_TAGS = new Set([
  'A',
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'UL',
  'OL',
  'LI',
  'PRE',
  'CODE',
  'BLOCKQUOTE',
  'TABLE',
  'THEAD',
  'TBODY',
  'TFOOT',
  'TR',
  'TH',
  'TD',
  'IMG',
  'STRONG',
  'EM',
  'B',
  'I',
  'BR',
  'HR',
  'FIGURE',
  'FIGCAPTION',
  'SPAN',
  'DIV',
  'ARTICLE',
  'SECTION',
  'NAV',
  'HEADER',
  'FOOTER',
  'MAIN',
  'ASIDE',
  'PICTURE',
  'SOURCE',
  'DETAILS',
  'SUMMARY',
  'DL',
  'DT',
  'DD',
  'SUB',
  'SUP',
  'DEL',
  'INS',
  'MARK',
  'KBD',
  'ABBR',
  'BLOCKQUOTE',
  'BODY',
]);

const ALLOWED_ATTR: Record<string, string[]> = {
  A: ['href', 'title'],
  IMG: ['src', 'alt', 'title'],
  SOURCE: ['src'],
  TD: ['colspan', 'rowspan'],
  TH: ['colspan', 'rowspan'],
};

function isHidden(el: Element): boolean {
  if (el.hasAttribute('hidden')) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  const style = el.getAttribute('style') ?? '';
  if (/display\s*:\s*none/i.test(style) || /visibility\s*:\s*hidden/i.test(style)) return true;
  return false;
}

function removeComments(root: Node): void {
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  for (const node of comments) node.remove();
}

export function stripJunk(root: Element, keepNav = false): void {
  removeComments(root);

  for (const selector of COOKIE_SELECTORS) {
    root.querySelectorAll(selector).forEach((el) => {
      if (keepNav && (el.closest('nav') || el.tagName === 'NAV')) return;
      el.remove();
    });
  }

  const doomed: Element[] = [];
  root.querySelectorAll('*').forEach((el) => {
    if (keepNav && (el.tagName === 'NAV' || el.closest('nav'))) {
      if (JUNK_TAGS.has(el.tagName) && el.tagName !== 'NAV') doomed.push(el);
      else if (isHidden(el) && el.tagName !== 'NAV') doomed.push(el);
      return;
    }
    if (JUNK_TAGS.has(el.tagName) || isHidden(el)) doomed.push(el);
  });
  for (const el of doomed) el.remove();

  root.querySelectorAll('iframe, embed, object').forEach((el) => {
    const src = el.getAttribute('src') || el.getAttribute('data') || '';
    const a = root.ownerDocument!.createElement('a');
    if (src) a.setAttribute('href', src);
    a.textContent = src ? `嵌入内容: ${src}` : '嵌入内容';
    el.replaceWith(a);
  });
}

export function resolveUrl(baseUrl: string, href: string): string {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html')) return '';
  if (trimmed.startsWith('data:')) return trimmed;
  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

function serializeNode(node: Node, baseUrl: string): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';
  const el = node as Element;
  const tag = el.tagName.toLowerCase();

  if (!ALLOWED_TAGS.has(el.tagName) && el.tagName !== 'BODY') {
    return Array.from(el.childNodes).map((child) => serializeNode(child, baseUrl)).join('');
  }

  if (el.tagName === 'BODY') {
    return Array.from(el.childNodes).map((child) => serializeNode(child, baseUrl)).join('');
  }

  const attrs: string[] = [];
  const allowed = ALLOWED_ATTR[el.tagName] ?? [];
  for (const name of allowed) {
    let raw = el.getAttribute(name);
    if (el.tagName === 'IMG' && name === 'src') {
      raw = el.getAttribute('data-src') || el.getAttribute('data-original') || raw;
    }
    if (!raw) continue;
    const value = name === 'href' || name === 'src' ? resolveUrl(baseUrl, raw) : raw;
    if (!value) continue;
    attrs.push(`${name}="${escapeAttr(value)}"`);
  }

  const children = Array.from(el.childNodes).map((child) => serializeNode(child, baseUrl)).join('');
  if (tag === 'img' || tag === 'br' || tag === 'hr') {
    return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`;
  }
  return `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>${children}</${tag}>`;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function serializeClean(root: Element, baseUrl: string): string {
  return serializeNode(root, baseUrl).replace(/\n{3,}/g, '\n\n').trim();
}

export function cleanClone(root: Element, baseUrl: string, keepNav = false): string {
  stripJunk(root, keepNav);
  return serializeClean(root, baseUrl);
}
