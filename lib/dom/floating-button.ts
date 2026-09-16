const HOST_ID = 'html2md-fab-host';
const STORAGE_KEY = 'html2md.fab.pos';
const SIZE = 36;
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
  // 荧光笔实验室的语言延伸到网页画布：单一荧光绿圆、清晰边缘（无模糊光晕）、
  // 明暗网页上都用投影与描边双层兜底可读性。发光只出现在 hover / 拖拽状态。
  style.textContent = `
    :host { all: initial; }
    .tab {
      all: initial;
      position: fixed;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${SIZE + 10}px;
      height: ${SIZE + 10}px;
      padding: 0 10px 0 0;
      border-radius: 50% 0 0 50%;
      background: transparent;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: transform .15s cubic-bezier(0.22, 1, 0.36, 1);
      z-index: 2147483646;
    }
    .dot {
      width: ${SIZE}px;
      height: ${SIZE}px;
      border-radius: 50% 0 0 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, oklch(0.60 0.16 160), oklch(0.45 0.14 160));
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.28),
        0 0 0 1px rgba(255, 255, 255, 0.25),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);
      transition: box-shadow .18s ease, transform .15s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .tab:hover .dot {
      box-shadow:
        0 3px 12px rgba(0, 0, 0, 0.32),
        0 0 10px oklch(0.60 0.16 160 / 0.55),
        0 0 0 1px rgba(255, 255, 255, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);
      transform: translateX(-2px);
    }
    .tab:active .dot { transform: translateX(-2px) scale(0.94); }
    .tab:focus-visible .dot {
      box-shadow:
        0 2px 8px rgba(0, 0, 0, 0.28),
        0 0 0 3px oklch(0.60 0.16 160 / 0.55),
        0 0 0 1px rgba(255, 255, 255, 0.25);
    }
    .tab.dragging { transition: none; cursor: grabbing; }
    .tab.dragging .dot {
      transform: scale(1.06);
      box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.35),
        0 0 14px oklch(0.60 0.16 160 / 0.6),
        0 0 0 1px rgba(255, 255, 255, 0.3),
        inset 0 1px 1px rgba(255, 255, 255, 0.3);
    }
    .dot svg { width: 18px; height: 18px; pointer-events: none; display: block; }
    @media (prefers-reduced-motion: reduce) {
      .tab, .dot { transition: none; }
      .tab:hover .dot { transform: none; }
      .tab.dragging .dot { transform: none; }
    }
  `;
  btn = document.createElement('div');
  btn.className = 'tab';
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  btn.setAttribute('aria-label', '打开网页转 Markdown');
  btn.innerHTML = `
    <span class="dot">
      <svg viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 6 V5 a1 1 0 0 1 1 -1 h1"/>
        <path d="M10 4 h4"/>
        <path d="M18 4 h1 a1 1 0 0 1 1 1 v1"/>
        <path d="M20 10 v4"/>
        <path d="M20 18 v1 a1 1 0 0 1 -1 1 h-1"/>
        <path d="M14 20 h-4"/>
        <path d="M6 20 h-1 a1 1 0 0 1 -1 -1 v-1"/>
        <path d="M8 10 v4 l4.5 2.6 a1.7 1.7 0 0 0 1.7 -2.9 L10 10 z" fill="#ffffff" stroke="none"/>
      </svg>
    </span>
  `;
  // 键盘可达：Enter / Space 等同点击
  btn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openSidePanel();
    }
  });
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
      // 落定回弹：从 1.06 缩放回到 1，给出「已放置」的确认感
      const dot = btn?.querySelector<HTMLElement>('.dot');
      if (dot) {
        dot.style.transition = 'transform .28s cubic-bezier(0.22, 1, 0.36, 1)';
        requestAnimationFrame(() => {
          dot.style.transform = 'scale(1)';
          setTimeout(() => {
            dot.style.transition = '';
            dot.style.transform = '';
          }, 300);
        });
      }
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
