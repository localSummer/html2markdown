import { intersectViewport } from './clip-rect';
import { liveRootsFor } from './regions';
import type { RegionType } from '../messages';

const HOST_ID = 'html2md-highlight-host';

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let layer: HTMLElement | null = null;
let activeRegion: RegionType | null = null;
let raf = 0;
let attached = false;

function ensureHost(): HTMLElement {
  if (host?.isConnected) return host;
  host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:2147483646;overflow:hidden;';
  shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    .layer { position: fixed; inset: 0; pointer-events: none; }
    .box {
      position: fixed;
      pointer-events: none;
      box-sizing: border-box;
      border: 2px solid rgba(16, 185, 129, 0.9);
      background: rgba(16, 185, 129, 0.10);
      border-radius: 10px;
      box-shadow:
        0 0 0 1px rgba(16, 185, 129, 0.22),
        0 0 16px 3px rgba(16, 185, 129, 0.42),
        inset 0 0 20px 3px rgba(16, 185, 129, 0.16);
      transition: box-shadow .15s ease, border-color .15s ease;
    }
    .box.stroke {
      background: transparent;
      box-shadow:
        0 0 0 1px rgba(16, 185, 129, 0.18),
        0 0 10px 2px rgba(16, 185, 129, 0.28);
    }
  `;
  layer = document.createElement('div');
  layer.className = 'layer';
  shadow.append(style, layer);
  document.documentElement.append(host);
  return host;
}

let cachedRegion: RegionType | null = null;
let cachedRoots: Element[] = [];

function rootsFor(region: RegionType): Element[] {
  if (cachedRegion === region) {
    const live = cachedRoots.filter((el) => el.isConnected);
    if (live.length > 0) {
      cachedRoots = live;
      return live;
    }
  }
  cachedRegion = region;
  cachedRoots = liveRootsFor(document, region);
  return cachedRoots;
}

function paint(): void {
  if (!layer || !activeRegion) {
    layer?.replaceChildren();
    return;
  }
  const roots = rootsFor(activeRegion);
  layer.replaceChildren();
  const strokeOnly = activeRegion === 'full';
  for (const el of roots) {
    const r = el.getBoundingClientRect();
    const box = intersectViewport(
      { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
      window.innerWidth,
      window.innerHeight,
    );
    if (!box) continue;
    const div = document.createElement('div');
    div.className = strokeOnly ? 'box stroke' : 'box';
    div.style.left = `${box.left}px`;
    div.style.top = `${box.top}px`;
    div.style.width = `${box.width}px`;
    div.style.height = `${box.height}px`;
    layer.append(div);
  }
}

function onScrollOrResize(): void {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    paint();
  });
}

function attachListeners(): void {
  if (attached) return;
  window.addEventListener('scroll', onScrollOrResize, { capture: true, passive: true });
  window.addEventListener('resize', onScrollOrResize, { passive: true });
  attached = true;
}

function detachListeners(): void {
  if (!attached) return;
  window.removeEventListener('scroll', onScrollOrResize, true);
  window.removeEventListener('resize', onScrollOrResize);
  attached = false;
}

export function highlightRegion(region: RegionType | null): void {
  activeRegion = region;
  if (!region) {
    clearHighlight();
    return;
  }
  cachedRegion = null;
  cachedRoots = [];
  ensureHost();
  attachListeners();
  paint();
}

export function clearHighlight(): void {
  activeRegion = null;
  cachedRegion = null;
  cachedRoots = [];
  detachListeners();
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  host?.remove();
  host = null;
  shadow = null;
  layer = null;
}
