import { useEffect, useRef } from "react";

interface UsePosAutoLockOptions {
  autoLockMinutes: number; // 0 = disabled
  isLocked: boolean;
  onLock: () => void;
}

export function usePosAutoLock({
  autoLockMinutes,
  isLocked,
  onLock,
}: UsePosAutoLockOptions) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onLockRef = useRef(onLock);
  onLockRef.current = onLock;

  useEffect(() => {
    if (autoLockMinutes <= 0 || isLocked) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const timeoutMs = autoLockMinutes * 60 * 1000;

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onLockRef.current();
      }, timeoutMs);
    };

    resetTimer();

    const activityEvents = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "scroll",
    ];

    const handleActivity = () => {
      resetTimer();
    };

    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleActivity);
      });
    };
  }, [autoLockMinutes, isLocked]);
}
