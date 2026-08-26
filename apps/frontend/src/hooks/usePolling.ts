'use client';

/**
 * usePolling — issue #967
 *
 * ⚠️  WARNING: Do NOT replace this hook with raw setInterval calls in polling
 * widgets. All interval-based polling must use this hook to guarantee cleanup
 * on unmount and avoid memory / network-request leaks.
 *
 * Usage:
 *   const { data, loading, error } = usePolling(fetchFn, { interval: 5000 });
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UsePollingOptions {
  /** Polling interval in milliseconds. Default: 5000. */
  interval?: number;
  /** Fetch immediately on mount before the first interval fires. Default: true. */
  immediate?: boolean;
  /** Pause polling (interval is cleared). Default: false. */
  paused?: boolean;
}

export interface UsePollingResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Manually trigger a fetch outside of the scheduled interval. */
  refresh: () => void;
}

/**
 * Generic polling hook.
 *
 * @param fetchFn - Async function that returns the polled value.
 * @param options - Polling configuration.
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  {
    interval = 5000,
    immediate = true,
    paused = false,
  }: UsePollingOptions = {},
): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate && !paused);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to fetchFn so the interval callback doesn't go stale
  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Polling failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (paused) return;

    if (immediate) {
      execute();
    }

    const id = setInterval(execute, interval);

    // Cleanup: clear the interval on unmount or when dependencies change
    return () => clearInterval(id);
  }, [execute, interval, immediate, paused]);

  return { data, loading, error, refresh: execute };
}
