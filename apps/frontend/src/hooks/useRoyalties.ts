'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { RoyaltyTx } from '@/components/royalties/RoyaltyTransactionHistory';

export interface UseRoyaltiesResult {
  transactions: RoyaltyTx[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRoyalties(userId?: string): UseRoyaltiesResult {
  const [transactions, setTransactions] = useState<RoyaltyTx[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .get(`/royalties/${userId}/transactions`)
      .then((res) => {
        if (!cancelled) setTransactions(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load royalty transactions.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, tick]);

  return {
    transactions,
    isLoading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
