import { intersectViewport } from './clip-rect';

describe('intersectViewport', () => {
  it('clips a box that overflows the viewport', () => {
    const box = intersectViewport({ left: -20, top: -10, right: 50, bottom: 40 }, 100, 80);
    expect(box).toEqual({ left: 0, top: 0, width: 50, height: 40 });
  });

  it('returns null when fully outside', () => {
    expect(intersectViewport({ left: 200, top: 200, right: 250, bottom: 260 }, 100, 80)).toBeNull();
  });

  it('keeps an in-view rectangle', () => {
    const box = intersectViewport({ left: 10, top: 20, right: 40, bottom: 50 }, 100, 80);
    expect(box).toEqual({ left: 10, top: 20, width: 30, height: 30 });
  });
});
