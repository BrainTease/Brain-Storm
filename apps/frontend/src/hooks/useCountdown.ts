'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseCountdownResult {
  secondsLeft: number;
  isActive: boolean;
  start: (seconds: number) => void;
  stop: () => void;
}

export function useCountdown(initialSeconds = 0): UseCountdownResult {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (seconds: number) => {
      stop();
      setSecondsLeft(seconds);
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stop],
  );

  useEffect(() => stop, [stop]);

  return { secondsLeft, isActive: secondsLeft > 0, start, stop };
}
