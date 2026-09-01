const HOST_ID = 'html2md-fab-host';
const STORAGE_KEY = 'html2md.fab.pos';
const SIZE = 30;
const DRAG_THRESHOLD = 4;

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let btn: HTMLElement | null = null;

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname || 'default';
  } catch {
    return 'default';
  }
}

async function loadY(hostname: string): Promise<number | null> {
  try {
    const res = await browser.storage.local.get(STORAGE_KEY);
    const all = (res[STORAGE_KEY] as Record<string, number> | undefined) ?? {};
    return typeof all[hostname] === 'number' ? all[hostname] : null;
  } catch {
    return null;
  }
}

async function saveY(hostname: string, y: number): Promise<void> {
  try {
    const res = await browser.storage.local.get(STORAGE_KEY);
    const all = (res[STORAGE_KEY] as Record<string, number> | undefined) ?? {};
    all[hostname] = y;
    await browser.storage.local.set({ [STORAGE_KEY]: all });
  } catch {
    /* ignore */
  }
}

function clampY(y: number): number {
  const top = 8;
  const bottom = window.innerHeight - SIZE - 8;
  return Math.max(top, Math.min(bottom, y));
}

function styleFor(y: number): string {
  return `position:fixed;right:0;top:${y}px;`;
}

function ensureMounted(): boolean {
  if (host?.isConnected) return true;
  host = document.createElement('div');
  host.id = HOST_ID;
  shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .tab {
      all: initial;
      position: fixed;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${SIZE + 6}px;
      height: ${SIZE + 12}px;
      padding: 0 6px 0 0;
      border-radius: 20px 0 0 20px;
      background: #ffffff;
      box-shadow: -2px 2px 10px rgba(0,0,0,0.12), -1px 1px 4px rgba(0,0,0,0.08);
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: transform .12s ease, box-shadow .12s ease;
      z-index: 2147483646;
    }
    .tab:hover { box-shadow: -3px 3px 14px rgba(0,0,0,0.16), -1px 1px 4px rgba(0,0,0,0.1); }
    .tab:active { transform: scale(0.96); }
    .tab.dragging { transition: none; cursor: grabbing; transform: none; filter: none; }
    .dot {
      width: ${SIZE}px;
      height: ${SIZE}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, oklch(0.62 0.17 160), oklch(0.52 0.15 160));
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.35), 0 2px 6px rgba(16,185,129,0.35);
      filter: blur(0.6px);
      opacity: 0.88;
      transition: filter .18s ease, opacity .18s ease;
    }
    .tab:hover .dot { filter: blur(0); opacity: 1; }
    .dot svg { width: 16px; height: 16px; pointer-events: none; display: block; }
  `;
  btn = document.createElement('div');
  btn.className = 'tab';
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('aria-label', '打开网页转 Markdown');
  btn.innerHTML = `
    <span class="dot">
      <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7 V5 a2 2 0 0 1 2 -2 h2"/>
        <path d="M17 3 h2 a2 2 0 0 1 2 2 v2"/>
        <path d="M21 17 v2 a2 2 0 0 1 -2 2 h-2"/>
        <path d="M7 21 h-2 a2 2 0 0 1 -2 -2 v-2"/>
        <path d="M9.2 8.6 l1.1 2.6 l2.6 1.1 l-2.6 1.1 l-1.1 2.6 l-1.1 -2.6 l-2.6 -1.1 l2.6 -1.1 z" fill="#ffffff" stroke="none"/>
        <text x="15.2" y="16.4" font-family="-apple-system,system-ui,sans-serif" font-size="9" font-weight="700" fill="#ffffff" stroke="none" text-anchor="middle">A</text>
      </svg>
    </span>
  `;
  shadow.append(style, btn);
  document.documentElement.append(host);
  return true;
}

function setY(y: number) {
  if (btn) btn.style.cssText = styleFor(clampY(y));
}

function openSidePanel() {
  void browser.runtime.sendMessage({ type: 'OPEN_SIDEPANEL' }).catch(() => {});
}

function attachDrag(initialY: number, hostname: string) {
  if (!btn) return;
  let dragging = false;
  let startY = 0;
  let startYPos = initialY;
  let moved = false;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    moved = false;
    startY = e.clientY;
    startYPos = clampY(initialY);
    btn?.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) <= DRAG_THRESHOLD && !moved) return;
    moved = true;
    btn?.classList.add('dragging');
    const next = clampY(startYPos + dy);
    setY(next);
    initialY = next;
  };

  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    btn?.classList.remove('dragging');
    if (moved) {
      void saveY(hostname, clampY(initialY));
    } else {
      openSidePanel();
    }
  };

  btn.addEventListener('pointerdown', onDown);
  btn.addEventListener('pointermove', onMove);
  btn.addEventListener('pointerup', onUp);
  btn.addEventListener('pointercancel', onUp);
}

export async function mountFloatingButton(): Promise<void> {
  if (!ensureMounted()) return;
  const hostname = hostnameOf(location.href);
  const saved = await loadY(hostname);
  const y = saved ?? Math.round((window.innerHeight - SIZE) / 2);
  setY(y);
  attachDrag(y, hostname);
}

export function unmountFloatingButton(): void {
  host?.remove();
  host = null;
  shadow = null;
  btn = null;
}
