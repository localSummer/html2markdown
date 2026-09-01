export type Rect = { left: number; top: number; right: number; bottom: number };
export type Box = { left: number; top: number; width: number; height: number };

export function intersectViewport(rect: Rect, vw: number, vh: number): Box | null {
  const left = Math.max(0, rect.left);
  const top = Math.max(0, rect.top);
  const right = Math.min(vw, rect.right);
  const bottom = Math.min(vh, rect.bottom);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}
