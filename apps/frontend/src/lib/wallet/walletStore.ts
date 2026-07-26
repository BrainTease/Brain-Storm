import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WalletErrorState, WalletType } from './types';

/**
 * Pure state container for the wallet. It holds values and setters only —
 * connection orchestration lives in `WalletProvider`, so this stays trivially
 * testable and usable outside React (e.g. `useWalletStore.getState()`).
 */
interface WalletState {
  address: string | null;
  network: string | null;
  balance: string | null;
  bstBalance: string | null;
  walletType: WalletType | null;
  isConnecting: boolean;
  error: WalletErrorState | null;
  balanceError: boolean;
  setAddress: (address: string | null) => void;
  setNetwork: (network: string | null) => void;
  setBalance: (balance: string | null) => void;
  setBstBalance: (balance: string | null) => void;
  setWalletType: (type: WalletType | null) => void;
  setIsConnecting: (v: boolean) => void;
  setError: (error: WalletErrorState | null) => void;
  setBalanceError: (v: boolean) => void;
  /** Applies a completed connection in one update to avoid intermediate renders. */
  applyConnection: (connection: {
    address: string;
    network: string;
    walletType: WalletType;
  }) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      network: null,
      balance: null,
      bstBalance: null,
      walletType: null,
      isConnecting: false,
      error: null,
      balanceError: false,
      setAddress: (address) => set({ address }),
      setNetwork: (network) => set({ network }),
      setBalance: (balance) => set({ balance }),
      setBstBalance: (bstBalance) => set({ bstBalance }),
      setWalletType: (walletType) => set({ walletType }),
      setIsConnecting: (isConnecting) => set({ isConnecting }),
      setError: (error) => set({ error }),
      setBalanceError: (balanceError) => set({ balanceError }),
      applyConnection: ({ address, network, walletType }) =>
        set({ address, network, walletType, error: null }),
      disconnect: () =>
        set({
          address: null,
          network: null,
          balance: null,
          bstBalance: null,
          walletType: null,
          error: null,
          balanceError: false,
        }),
    }),
    {
      name: 'wallet-store',
      partialize: (s) => ({ address: s.address, network: s.network, walletType: s.walletType }),
    }
  )
);
