import { clearHighlight, highlightElements, highlightHostId } from './highlight';

const FAB_HOST_ID = 'html2md-fab-host';

export type PickOutcome =
  | { ok: true; tag: string; charCount: number }
  | { ok: false; error: string };

let picked: Element | null = null;
let picking = false;
let resolvePick: ((result: PickOutcome) => void) | null = null;
let prevCursor = '';

function charCount(el: Element): number {
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().length;
}

function isOwnUi(el: Element): boolean {
  const highlightId = highlightHostId();
  let n: Element | null = el;
  while (n) {
    if (n.id === FAB_HOST_ID || n.id === highlightId) return true;
    n = n.parentElement;
  }
  return false;
}

function pickableFromPoint(x: number, y: number): Element | null {
  const stack = document.elementsFromPoint(x, y);
  for (const el of stack) {
    if (isOwnUi(el)) continue;
    if (el === document.documentElement) continue;
    return el;
  }
  return null;
}

function finish(result: PickOutcome, forget = false): void {
  if (!picking && !resolvePick) return;
  picking = false;
  window.removeEventListener('mousemove', onMove, true);
  window.removeEventListener('click', onClick, true);
  window.removeEventListener('keydown', onKey, true);
  document.documentElement.style.cursor = prevCursor;
  const resolve = resolvePick;
  resolvePick = null;
  if (!result.ok && forget) picked = null;
  if (!result.ok) clearHighlight();
  resolve?.(result);
}

function onMove(e: MouseEvent): void {
  const el = pickableFromPoint(e.clientX, e.clientY);
  if (el) highlightElements([el]);
}

function onClick(e: MouseEvent): void {
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  const el = pickableFromPoint(e.clientX, e.clientY);
  if (!el) return;
  picked = el;
  highlightElements([el]);
  finish({ ok: true, tag: el.tagName.toLowerCase(), charCount: charCount(el) });
}

function onKey(e: KeyboardEvent): void {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  finish({ ok: false, error: '已取消' });
}

export function getPickedElement(): Element | null {
  return picked?.isConnected ? picked : null;
}

export function cancelPicker(opts?: { forget?: boolean }): void {
  const forget = Boolean(opts?.forget);
  if (picking || resolvePick) {
    finish({ ok: false, error: '已取消' }, forget);
    return;
  }
  if (forget) picked = null;
  clearHighlight();
}

export function startPicker(): Promise<PickOutcome> {
  if (picking) finish({ ok: false, error: '已取消' });
  picking = true;
  clearHighlight();
  prevCursor = document.documentElement.style.cursor;
  document.documentElement.style.cursor = 'crosshair';
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('click', onClick, true);
  window.addEventListener('keydown', onKey, true);
  return new Promise((resolve) => {
    resolvePick = resolve;
  });
}
