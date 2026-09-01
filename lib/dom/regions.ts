import type { ImageMeta, RegionSummary, RegionType } from '../messages';

export function findNavElements(doc: Document): Element[] {
  return Array.from(doc.querySelectorAll('nav, [role="navigation"]'));
}

function textLength(el: Element): number {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().length;
}

function mainScore(el: Element): { score: number; len: number } {
  const len = textLength(el);
  if (len < MIN_MAIN_SCORE) return { score: 0, len };
  let linkLen = 0;
  for (const a of Array.from(el.querySelectorAll('a'))) linkLen += textLength(a);
  const linkDensity = Math.min(linkLen / len, 1);
  const paragraphBonus = 1 + Math.min(el.querySelectorAll('p').length, 10) * 0.02;
  const semanticBonus = el.matches('article, main, [role="main"]') ? 1.25 : 1;
  return { score: len * (1 - linkDensity) * paragraphBonus * semanticBonus, len };
}

const MIN_MAIN_SCORE = 50;
const TIE_TOLERANCE = 0.02;
const MAX_MAIN_CANDIDATES = 120;

function collectMainCandidates(root: Element): Element[] {
  const seen = new Set<Element>();
  const out: Element[] = [];
  const addChain = (start: Element | null) => {
    let el = start;
    while (el && el !== root) {
      if (!seen.has(el)) {
        seen.add(el);
        out.push(el);
        if (out.length >= MAX_MAIN_CANDIDATES) return;
      }
      el = el.parentElement;
    }
  };
  for (const el of root.querySelectorAll('article, main, [role="main"], section, p')) {
    if (el.tagName === 'P') addChain(el.parentElement);
    else {
      if (!seen.has(el)) {
        seen.add(el);
        out.push(el);
      }
      addChain(el.parentElement);
    }
    if (out.length >= MAX_MAIN_CANDIDATES) break;
  }
  return out;
}

// 语义标签（article/main）优先；无语义标签时只对段落祖先和语义容器打分，
// 避免遍历页面上所有 div。同分带内取更小元素。
export function findMainElement(doc: Document): Element {
  const semantic = doc.querySelector('article, main, [role="main"]');
  if (semantic && mainScore(semantic).score >= MIN_MAIN_SCORE) return semantic;

  const root: Element = doc.body ?? doc.documentElement;
  let best: Element = root;
  let { score: bestScore, len: bestLen } = mainScore(root);
  for (const el of collectMainCandidates(root)) {
    const { score, len } = mainScore(el);
    if (score < MIN_MAIN_SCORE) continue;
    const clearlyBetter = score > bestScore * (1 + TIE_TOLERANCE);
    const tieButTighter = score >= bestScore * (1 - TIE_TOLERANCE) && len < bestLen;
    if (clearlyBetter || tieButTighter) {
      best = el;
      bestScore = score;
      bestLen = len;
    }
  }
  return best;
}

function charCount(el: Element | null): number {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim().length;
}

function isDecorativeMeta(image: ImageMeta): boolean {
  if (image.role === 'presentation' || image.role === 'none') return true;
  const w = image.width;
  const h = image.height;
  if (w > 0 && h > 0 && (w <= 1 || h <= 1)) return true;
  if (w > 0 && h > 0 && w < 64 && h < 64) return true;
  return false;
}

function imageStatsFrom(
  roots: Element[],
  baseUrl: string,
): { imageTotal: number; imageDecorative: number } {
  const images = roots.flatMap((el) => collectImages(el, baseUrl));
  return {
    imageTotal: images.length,
    imageDecorative: images.filter(isDecorativeMeta).length,
  };
}

function regionFrom(
  id: RegionType,
  label: string,
  countEl: Element | null,
  roots: Element[],
  baseUrl: string,
): RegionSummary {
  return {
    id,
    label,
    charCount: charCount(countEl),
    ...imageStatsFrom(roots, baseUrl),
  };
}

const FULL_DEDUPE_RATIO = 0.9;
const NAV_MERGE_RATIO = 1.05;

export function detectRegions(doc: Document, baseUrl = doc.baseURI || ''): RegionSummary[] {
  const body = doc.body;
  if (!body || charCount(body) === 0) return [];

  const mainEl = findMainElement(doc);
  const mainChars = charCount(mainEl);
  const fullChars = charCount(body);
  const mainRoots = [mainEl];

  const regions: RegionSummary[] = [regionFrom('main', '主内容', mainEl, mainRoots, baseUrl)];

  const navs = findNavElements(doc);
  const navChars = navs.reduce((sum, el) => sum + charCount(el), 0);
  if (navs.length > 0 && navChars > 0) {
    regions.push({
      id: 'nav',
      label: '导航',
      charCount: navChars,
      ...imageStatsFrom(navs, baseUrl),
    });
    if (mainChars + navChars > mainChars * NAV_MERGE_RATIO) {
      regions.push({
        id: 'main_nav',
        label: '内容+导航',
        charCount: mainChars + navChars,
        ...imageStatsFrom([...mainRoots, ...navs], baseUrl),
      });
    }
  }

  const covered = regions.some((r) => r.charCount >= fullChars * FULL_DEDUPE_RATIO);
  if (!covered) regions.push(regionFrom('full', '全文', body, body ? [body] : [], baseUrl));
  return regions;
}

export function liveRootsFor(doc: Document, type: RegionType): Element[] {
  if (type === 'full') return doc.body ? [doc.body] : [];
  if (type === 'nav') return findNavElements(doc);
  if (type === 'main') return [findMainElement(doc)];
  return [findMainElement(doc), ...findNavElements(doc)];
}

export function collectImages(root: Element, baseUrl: string): ImageMeta[] {
  const seen = new Set<string>();
  const out: ImageMeta[] = [];
  for (const img of Array.from(root.querySelectorAll('img'))) {
    const raw = img.getAttribute('src') || img.currentSrc || '';
    if (!raw) continue;
    let src = raw;
    try {
      src = new URL(raw, baseUrl).href;
    } catch {
      /* keep raw */
    }
    if (seen.has(src)) continue;
    seen.add(src);
    out.push({
      src,
      alt: img.getAttribute('alt') ?? '',
      width: img.naturalWidth || img.width || Number(img.getAttribute('width')) || 0,
      height: img.naturalHeight || img.height || Number(img.getAttribute('height')) || 0,
      role: img.getAttribute('role'),
    });
  }
  return out;
}
