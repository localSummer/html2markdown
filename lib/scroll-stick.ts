export const STICK_LEAVE_PX = 40;
/** Mac 触摸板是亚像素 scrollTop，1px 会把跟滚误判成「还要贴底」。 */
export const PIN_EPSILON_PX = 4;

export function gapFromBottom(scrollHeight: number, scrollTop: number, clientHeight: number): number {
  return scrollHeight - scrollTop - clientHeight;
}

export function isAwayFromBottom(gap: number): boolean {
  return gap > STICK_LEAVE_PX;
}

export function needsPin(gap: number): boolean {
  return gap > PIN_EPSILON_PX;
}

/** 双指滑动才算跟滚手势；捏合缩放（ctrl+wheel）和横向滑忽略。 */
export function isFollowWheel(ctrlKey: boolean, deltaX: number, deltaY: number): boolean {
  if (ctrlKey) return false;
  if (deltaY === 0) return false;
  return Math.abs(deltaY) >= Math.abs(deltaX);
}

/** 只有用户手势中的 scrollend 才结算跟滚；程序 pin 产生的 scrollend 会再 pin，Mac 叠加滚动条就会闪。 */
export function shouldSettleOnScrollEnd(userScrolling: boolean): boolean {
  return userScrolling;
}
