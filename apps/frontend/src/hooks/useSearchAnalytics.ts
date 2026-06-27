'use client';

import { useEffect, useRef } from 'react';

export interface SearchAnalyticsEvent {
  query: string;
  filters: {
    level?: string;
    category?: string;
    duration?: string;
    sort?: string;
  };
  resultsCount: number;
  timestamp: string;
}

export function useSearchAnalytics(
  query: string,
  filters: { level: string; category: string; duration: string; sort: string },
  resultsCount: number
) {
  const previousQuery = useRef<string>('');

  useEffect(() => {
    if (!query.trim() || query === previousQuery.current) return;

    previousQuery.current = query;

    const event: SearchAnalyticsEvent = {
      query,
      filters: {
        ...(filters.level && { level: filters.level }),
        ...(filters.category && { category: filters.category }),
        ...(filters.duration && { duration: filters.duration }),
        ...(filters.sort !== 'newest' && { sort: filters.sort }),
      },
      resultsCount,
      timestamp: new Date().toISOString(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Search Analytics]', event);
    }

    // Send to analytics endpoint (placeholder)
    fetch('/api/analytics/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }).catch((err) => {
      // Silently fail - analytics should not break user experience
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Search Analytics] Failed to send event:', err);
      }
    });
  }, [query, filters, resultsCount]);
}
