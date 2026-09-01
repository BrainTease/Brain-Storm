'use client';

import { useCallback, useMemo } from 'react';
import { useWallet as useCoreWallet, type WalletContextValue } from '@/lib/wallet';
import { BrainStormClient } from '@brain-storm/sdk';

const sdkClient = new BrainStormClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.brain-storm.com',
});

export interface ExtendedWalletValue extends WalletContextValue {
  /** SDK instance backed methods */
  fetchSdkStellarBalance: (
    publicKey: string
  ) => Promise<{ balances: Array<{ asset_type: string; balance: string; asset_code?: string }> }>;
}

/**
 * Unified useWallet hook providing Stellar wallet connection state,
 * network selection, signing, and balance operations backed by @brain-storm/sdk.
 */
export function useWallet(): ExtendedWalletValue {
  const coreWallet = useCoreWallet();

  const fetchSdkStellarBalance = useCallback(async (publicKey: string) => {
    return sdkClient.stellar.getBalance(publicKey);
  }, []);

  return useMemo(
    () => ({
      ...coreWallet,
      fetchSdkStellarBalance,
    }),
    [coreWallet, fetchSdkStellarBalance]
  );
}

export default useWallet;
