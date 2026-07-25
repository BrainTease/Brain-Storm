'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { getWalletAdapter } from './adapters';
import { fetchBalances } from './balances';
import { truncateAddress } from './address';
import { isExpectedNetwork } from './network';
import { useWalletStore } from './walletStore';
import {
  WalletError,
  toWalletErrorState,
  type WalletAdapter,
  type WalletErrorState,
  type WalletType,
} from './types';

export interface WalletContextValue {
  /** Connected public key, or `null` when disconnected. */
  address: string | null;
  /** `GABC…WXYZ` form of `address`. */
  truncatedAddress: string | null;
  network: string | null;
  /** `true` when the wallet is on a different network than the app expects. */
  networkMismatch: boolean;
  balance: string | null;
  bstBalance: string | null;
  walletType: WalletType | null;
  /** Adapter backing the current connection, for install links and metadata. */
  adapter: WalletAdapter | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: WalletErrorState | null;
  balanceError: boolean;
  connect: (type?: WalletType) => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  /** Signs an XDR with the connected wallet. */
  signTransaction: (xdr: string) => Promise<string>;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

/**
 * Owns wallet-connection orchestration: picking an adapter, driving the
 * connect/sign flows, loading balances and translating adapter failures into
 * store state. Components consume it through `useWallet()` and never talk to an
 * adapter directly.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const address = useWalletStore((s) => s.address);
  const network = useWalletStore((s) => s.network);
  const balance = useWalletStore((s) => s.balance);
  const bstBalance = useWalletStore((s) => s.bstBalance);
  const walletType = useWalletStore((s) => s.walletType);
  const isConnecting = useWalletStore((s) => s.isConnecting);
  const error = useWalletStore((s) => s.error);
  const balanceError = useWalletStore((s) => s.balanceError);

  const loadBalances = useCallback(async (publicKey: string) => {
    const store = useWalletStore.getState();
    try {
      const { xlm, bst } = await fetchBalances(publicKey);
      store.setBalance(xlm);
      store.setBstBalance(bst);
      store.setBalanceError(false);
    } catch {
      store.setBalance(null);
      store.setBstBalance(null);
      store.setBalanceError(true);
    }
  }, []);

  const connect = useCallback(
    async (type: WalletType = 'freighter') => {
      const store = useWalletStore.getState();
      store.setIsConnecting(true);
      store.setError(null);
      try {
        const adapter = getWalletAdapter(type);
        const { publicKey, network: reportedNetwork } = await adapter.connect();
        store.applyConnection({ address: publicKey, network: reportedNetwork, walletType: type });
        await loadBalances(publicKey);
      } catch (err) {
        store.setError(toWalletErrorState(err, type));
      } finally {
        store.setIsConnecting(false);
      }
    },
    [loadBalances]
  );

  const refreshBalances = useCallback(async () => {
    const current = useWalletStore.getState().address;
    if (!current) return;
    await loadBalances(current);
  }, [loadBalances]);

  const signTransaction = useCallback(async (xdr: string) => {
    const type = useWalletStore.getState().walletType;
    if (!type) {
      throw new WalletError('NO_WALLET_CONNECTED', 'No wallet connected.');
    }
    return getWalletAdapter(type).sign(xdr);
  }, []);

  const disconnect = useCallback(() => useWalletStore.getState().disconnect(), []);
  const clearError = useCallback(() => useWalletStore.getState().setError(null), []);

  // A persisted session restores address/walletType but not balances — fetch
  // them once on mount so a returning user does not see empty values.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !address) return;
    hydratedRef.current = true;
    void loadBalances(address);
  }, [address, loadBalances]);

  const value = useMemo<WalletContextValue>(
    () => ({
      address,
      truncatedAddress: address ? truncateAddress(address) : null,
      network,
      networkMismatch: !!network && !isExpectedNetwork(network),
      balance,
      bstBalance,
      walletType,
      adapter: walletType ? getWalletAdapter(walletType) : null,
      isConnected: !!address,
      isConnecting,
      error,
      balanceError,
      connect,
      disconnect,
      refreshBalances,
      signTransaction,
      clearError,
    }),
    [
      address,
      network,
      balance,
      bstBalance,
      walletType,
      isConnecting,
      error,
      balanceError,
      connect,
      disconnect,
      refreshBalances,
      signTransaction,
      clearError,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
