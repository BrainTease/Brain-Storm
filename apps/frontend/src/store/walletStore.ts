import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WalletType = 'freighter' | 'albedo' | 'xbull' | 'walletconnect';

interface WalletState {
  address: string | null;
  network: string | null;
  balance: string | null;
  bstBalance: string | null;
  walletType: WalletType | null;
  isConnecting: boolean;
  error: string | null;
  balanceError: boolean;
  setAddress: (address: string | null) => void;
  setNetwork: (network: string | null) => void;
  setBalance: (balance: string | null) => void;
  setBstBalance: (balance: string | null) => void;
  setWalletType: (type: WalletType | null) => void;
  setIsConnecting: (v: boolean) => void;
  setError: (error: string | null) => void;
  setBalanceError: (v: boolean) => void;
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
