import { useRef } from 'react';

interface UseSwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export function useSwipeGesture({ onSwipeLeft, onSwipeRight, threshold = 50 }: UseSwipeGestureOptions) {
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (_e: React.TouchEvent) => {};

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const distance = startX.current - e.changedTouches[0].clientX;
    if (distance > threshold) onSwipeLeft?.();
    else if (distance < -threshold) onSwipeRight?.();
    startX.current = null;
  };

  return { onTouchStart, onTouchMove, onTouchEnd };
}
