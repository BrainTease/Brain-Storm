'use client';

/**
 * BuybackTracker — issue #967
 *
 * ⚠️  WARNING: Do NOT re-introduce raw setInterval here. Polling is managed
 * exclusively by the usePolling hook so that interval cleanup on unmount is
 * guaranteed, preventing network-request and memory leaks.
 */

import React from 'react';
import { usePolling } from '@/hooks/usePolling';
import { Spinner } from '@/components/ui/Spinner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuybackState {
  totalBuyback: number;
  lastBuybackAt: string | null;
  pendingAmount: number;
  currency: string;
}

interface BuybackTrackerProps {
  /** Async function that fetches latest buyback state from the contract. */
  fetchBuybackState: () => Promise<BuybackState>;
  /** Polling interval in milliseconds. Default: 10 000. */
  pollInterval?: number;
  /** Optional CSS override for the root container. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BuybackTracker({
  fetchBuybackState,
  pollInterval = 10_000,
  className = '',
}: BuybackTrackerProps) {
  const { data, loading, error } = usePolling(fetchBuybackState, {
    interval: pollInterval,
    immediate: true,
  });

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 p-5 space-y-4 ${className}`}
      data-testid="buyback-tracker"
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
        Buyback Tracker
      </h3>

      {loading && !data && (
        <div
          className="flex items-center gap-2 text-gray-500 dark:text-gray-400"
          data-testid="buyback-tracker-loading"
        >
          <Spinner size="sm" label="Loading buyback data…" />
          <span className="text-sm">Loading…</span>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400"
          data-testid="buyback-tracker-error"
        >
          {error}
        </p>
      )}

      {data && (
        <dl className="grid grid-cols-2 gap-3 text-sm" data-testid="buyback-tracker-data">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Total Buyback</dt>
            <dd className="font-semibold text-gray-900 dark:text-gray-100">
              {data.totalBuyback.toLocaleString()} {data.currency}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Pending</dt>
            <dd className="font-semibold text-gray-900 dark:text-gray-100">
              {data.pendingAmount.toLocaleString()} {data.currency}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500 dark:text-gray-400">Last Buyback</dt>
            <dd className="font-semibold text-gray-900 dark:text-gray-100">
              {data.lastBuybackAt ? new Date(data.lastBuybackAt).toLocaleString() : 'Never'}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
