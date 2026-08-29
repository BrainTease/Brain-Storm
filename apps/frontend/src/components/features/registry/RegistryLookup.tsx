'use client';

/**
 * RegistryLookup — issue #968
 *
 * ⚠️  WARNING: Do NOT fire requests per-keystroke from this component.
 * - Search input is debounced (300 ms) via useDebounce.
 * - Each new query cancels in-flight requests from the previous query via
 *   AbortController so stale responses can never overwrite fresh results.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Spinner } from '@/components/ui/Spinner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RegistryEntry {
  id: string;
  name: string;
  address: string;
  description?: string;
}

interface RegistryLookupProps {
  /**
   * Async function that performs the actual search.
   * Receives the query string and an AbortSignal; should throw if aborted.
   */
  search: (query: string, signal: AbortSignal) => Promise<RegistryEntry[]>;
  /** Debounce delay in milliseconds. Default: 300. */
  debounceMs?: number;
  /** Placeholder text for the search input. */
  placeholder?: string;
  /** Optional CSS override. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RegistryLookup({
  search,
  debounceMs = 300,
  placeholder = 'Search registry…',
  className = '',
}: RegistryLookupProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RegistryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  // Hold a ref to the currently active AbortController so we can cancel it
  // when a newer query supersedes it.
  const abortControllerRef = useRef<AbortController | null>(null);

  const executeSearch = useCallback(
    async (q: string) => {
      // Cancel any in-flight request from the previous query
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      if (!q.trim()) {
        setResults([]);
        setLoading(false);
        setError(null);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const data = await search(q, controller.signal);
        // Only update state if this request was not superseded
        if (!controller.signal.aborted) {
          setResults(data);
        }
      } catch (err: unknown) {
        // Ignore abort errors — they are intentional cancellations
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [search]
  );

  useEffect(() => {
    executeSearch(debouncedQuery);
  }, [debouncedQuery, executeSearch]);

  // Cleanup: abort any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div className={`space-y-3 ${className}`} data-testid="registry-lookup">
      <div className="relative">
        <label htmlFor="registry-search" className="sr-only">
          Search registry
        </label>
        <input
          id="registry-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-700 pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Search registry"
          aria-describedby="registry-search-hint"
          data-testid="registry-search-input"
        />
        <p id="registry-search-hint" className="sr-only">
          Results update automatically after you stop typing.
        </p>
        {loading ? (
          <span className="absolute right-3 top-2.5" data-testid="registry-search-spinner">
            <Spinner size="sm" label="Searching…" />
          </span>
        ) : (
          <svg
            className="absolute left-3 top-3 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
          data-testid="registry-search-error"
        >
          {error}
        </p>
      )}

      {!loading && !error && debouncedQuery && results.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400" data-testid="registry-search-empty">
          No results found for &ldquo;{debouncedQuery}&rdquo;.
        </p>
      )}

      {results.length > 0 && (
        <ul
          className="divide-y divide-gray-100 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700"
          role="list"
          aria-label="Registry search results"
          data-testid="registry-search-results"
        >
          {results.map((entry) => (
            <li
              key={entry.id}
              className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              data-testid={`registry-entry-${entry.id}`}
            >
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{entry.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                {entry.address}
              </p>
              {entry.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {entry.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
