'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseApiQueryOptions<T> {
  /** Value exposed as `data` before the first successful load. */
  initialData?: T | null;
  /**
   * Message exposed as `error` when the fetcher rejects. When omitted, the
   * rejection's own message is used, falling back to a generic string.
   */
  errorMessage?: string;
}

export interface UseApiQueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  /** Re-runs the fetcher for the current key. */
  refresh: () => void;
}

const FALLBACK_ERROR = 'Request failed.';

/**
 * Loads data for a keyed query and tracks its loading, error and refresh state.
 *
 * - A `null` key disables the query: nothing is fetched and `isLoading` is false.
 * - The fetcher re-runs whenever the key's contents change, compared by value.
 * - On failure the previous `data` is kept, so a refresh that fails does not
 *   blank the screen.
 * - Results from a superseded key are ignored, so a slow response cannot
 *   overwrite a newer one.
 *
 * The fetcher may use any transport (axios, `fetch`, ...); it only has to return
 * a promise.
 */
export function useApiQuery<T>(
  key: readonly unknown[] | null,
  fetcher: () => Promise<T>,
  options: UseApiQueryOptions<T> = {}
): UseApiQueryResult<T> {
  const { initialData = null, errorMessage } = options;
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(key !== null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Read the latest fetcher without making it an effect dependency. Callers
  // usually pass an inline arrow, which changes identity on every render.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const keyString = key === null ? null : JSON.stringify(key);

  useEffect(() => {
    if (keyString === null) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetcherRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage ?? (err instanceof Error ? err.message : FALLBACK_ERROR));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `errorMessage` is read at settle time and is not part of the query identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyString, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { data, isLoading, error, refresh };
}
