import { useCallback, useEffect, useRef, type RefObject, type WheelEvent } from 'react';
import {
  gapFromBottom,
  isAwayFromBottom,
  isFollowWheel,
  needsPin,
  shouldSettleOnScrollEnd,
} from '../../lib/scroll-stick';

const SCROLLEND_FALLBACK_MS = 480;

export function useStickToBottom<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  onLeave?: () => void,
) {
  const stickRef = useRef(true);
  const skipGenRef = useRef(0);
  const skipRef = useRef(false);
  const userScrollRef = useRef(false);
  const pinRafRef = useRef(0);
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  useEffect(() => {
    if (!active) return;
    stickRef.current = true;
    // 初始化时直接滚到底部，不依赖 pin 避免循环引用
    const el = ref.current;
    if (!el) return;
    const rafId = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(rafId);
  }, [active, ref]);

  const pinNow = useCallback(() => {
    if (!active || !stickRef.current || userScrollRef.current) return;
    const el = ref.current;
    if (!el) return;
    const gap = gapFromBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
    if (!needsPin(gap)) return;
    skipRef.current = true;
    const gen = ++skipGenRef.current;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (skipGenRef.current === gen) skipRef.current = false;
      });
    });
  }, [active, ref]);

  const pin = useCallback(() => {
    if (pinRafRef.current) return;
    pinRafRef.current = requestAnimationFrame(() => {
      pinRafRef.current = 0;
      pinNow();
    });
  }, [pinNow]);

  const settle = useCallback(() => {
    userScrollRef.current = false;
    if (quietTimerRef.current) {
      clearTimeout(quietTimerRef.current);
      quietTimerRef.current = null;
    }
    if (!active) return;
    const el = ref.current;
    if (!el) return;
    const gap = gapFromBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
    if (isAwayFromBottom(gap)) {
      if (stickRef.current) {
        stickRef.current = false;
        onLeaveRef.current?.();
      }
      return;
    }
    // 恢复跟随时，无条件滚到底部（不检查 needsPin）
    stickRef.current = true;
    skipRef.current = true;
    const gen = ++skipGenRef.current;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (skipGenRef.current === gen) skipRef.current = false;
      });
    });
  }, [active, ref]);

  const armQuietTimer = useCallback(() => {
    if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
    quietTimerRef.current = setTimeout(settle, SCROLLEND_FALLBACK_MS);
  }, [settle]);

  const markUserScroll = useCallback(() => {
    userScrollRef.current = true;
    armQuietTimer();
  }, [armQuietTimer]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const onEnd = () => {
      skipRef.current = false;
      if (!shouldSettleOnScrollEnd(userScrollRef.current)) return;
      settle();
    };
    el.addEventListener('scrollend', onEnd);
    return () => el.removeEventListener('scrollend', onEnd);
  }, [active, ref, settle]);

  useEffect(() => {
    return () => {
      if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
      if (pinRafRef.current) cancelAnimationFrame(pinRafRef.current);
    };
  }, []);

  const onScroll = useCallback(() => {
    if (skipRef.current || !active) return;
    const el = ref.current;
    if (!el) return;
    const gap = gapFromBottom(el.scrollHeight, el.scrollTop, el.clientHeight);
    if (!isAwayFromBottom(gap)) return;
    if (stickRef.current) {
      stickRef.current = false;
      onLeaveRef.current?.();
    }
  }, [active, ref]);

  const onWheel = useCallback(
    (e: WheelEvent<HTMLElement>) => {
      if (!active || !isFollowWheel(e.ctrlKey, e.deltaX, e.deltaY)) return;
      markUserScroll();
    },
    [active, markUserScroll],
  );

  return { pin, onScroll, onWheel };
}
