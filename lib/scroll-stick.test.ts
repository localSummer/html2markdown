import { gapFromBottom, isAwayFromBottom, isFollowWheel, needsPin, shouldSettleOnScrollEnd } from './scroll-stick';

describe('scroll stick', () => {
  it('measures distance from the bottom', () => {
    expect(gapFromBottom(200, 80, 100)).toBe(20);
    expect(gapFromBottom(200, 100, 100)).toBe(0);
  });

  it('leaves follow only after ~40px', () => {
    expect(isAwayFromBottom(40)).toBe(false);
    expect(isAwayFromBottom(41)).toBe(true);
  });

  it('skips pin when already near the bottom (subpixel)', () => {
    expect(needsPin(0)).toBe(false);
    expect(needsPin(4)).toBe(false);
    expect(needsPin(5)).toBe(true);
  });

  it('treats vertical trackpad pans as follow gestures', () => {
    expect(isFollowWheel(false, 0, -8)).toBe(true);
    expect(isFollowWheel(false, 0, 8)).toBe(true);
    expect(isFollowWheel(true, 0, -8)).toBe(false);
    expect(isFollowWheel(false, 12, -3)).toBe(false);
    expect(isFollowWheel(false, 0, 0)).toBe(false);
  });

  it('ignores programmatic scrollend when settling follow', () => {
    expect(shouldSettleOnScrollEnd(true)).toBe(true);
    expect(shouldSettleOnScrollEnd(false)).toBe(false);
  });
});
