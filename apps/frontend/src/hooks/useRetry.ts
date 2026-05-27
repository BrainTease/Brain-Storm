'use client';

import { useCallback, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

interface UseRetryOptions {
  maxAttempts?: number;
  backoffMs?: number;
  onError?: (error: Error, attempt: number) => void;
}

interface UseRetryResult<T> {
  execute: () => Promise<T | undefined>;
  isRetrying: boolean;
  attempt: number;
  error: Error | null;
  reset: () => void;
}

export function useRetry<T>(
  fn: () => Promise<T>,
  options: UseRetryOptions = {},
): UseRetryResult<T> {
  const { maxAttempts = 3, backoffMs = 500, onError } = options;
  const [isRetrying, setIsRetrying] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (): Promise<T | undefined> => {
    setIsRetrying(true);
    setError(null);
    let lastError: Error | null = null;

    for (let i = 0; i < maxAttempts; i++) {
      setAttempt(i + 1);
      try {
        const result = await fn();
        setIsRetrying(false);
        setError(null);
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        onError?.(lastError, i + 1);
        if (i < maxAttempts - 1) {
          await new Promise((r) => setTimeout(r, backoffMs * Math.pow(2, i)));
        }
      }
    }

    if (lastError) {
      Sentry.captureException(lastError, {
        tags: { source: 'useRetry', attempts: String(maxAttempts) },
      });
      setError(lastError);
    }
    setIsRetrying(false);
    return undefined;
  }, [fn, maxAttempts, backoffMs, onError]);

  const reset = useCallback(() => {
    setError(null);
    setAttempt(0);
    setIsRetrying(false);
  }, []);

  return { execute, isRetrying, attempt, error, reset };
}
