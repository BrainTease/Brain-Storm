'use client';

import api from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
import type { RoyaltyTx } from '@/components/royalties/RoyaltyTransactionHistory';

export interface UseRoyaltiesResult {
  transactions: RoyaltyTx[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRoyalties(userId?: string): UseRoyaltiesResult {
  const { data, isLoading, error, refresh } = useApiQuery<RoyaltyTx[]>(
    userId ? ['royalties', userId] : null,
    () => api.get(`/royalties/${userId}/transactions`).then((res) => res.data ?? []),
    { errorMessage: 'Failed to load royalty transactions.' }
  );

  return { transactions: data ?? [], isLoading, error, refresh };
}
