'use client';

import { useWalletStore, WalletType } from '@/store/walletStore';
import {
  connectFreighter,
  fetchXlmBalance,
  fetchBstBalance,
  isFreighterInstalled,
  truncateAddress,
} from '@/lib/walletApi';
import { connectAlbedo, connectXbull } from '@/lib/walletAdapters';

const EXPECTED_NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';

async function loadBalances(
  address: string,
  setBalance: (b: string | null) => void,
  setBstBalance: (b: string | null) => void,
  setBalanceError: (v: boolean) => void
) {
  try {
    const [xlm, bst] = await Promise.all([
      fetchXlmBalance(address),
      fetchBstBalance(address),
    ]);
    setBalance(xlm);
    setBstBalance(bst);
    setBalanceError(false);
  } catch {
    setBalance(null);
    setBstBalance(null);
    setBalanceError(true);
  }
}

export function useWallet() {
  const store = useWalletStore();

  const networkMismatch =
    !!store.network &&
    !store.network.toLowerCase().includes(EXPECTED_NETWORK.toLowerCase());

  async function connect(type: WalletType = 'freighter') {
    store.setIsConnecting(true);
    store.setError(null);
    try {
      let publicKey: string;
      let network: string;

      if (type === 'freighter') {
        if (!isFreighterInstalled()) {
          store.setError('FREIGHTER_NOT_INSTALLED');
          return;
        }
        const result = await connectFreighter();
        publicKey = result.publicKey;
        network = result.network;
      } else if (type === 'albedo') {
        const result = await connectAlbedo();
        publicKey = result.publicKey;
        network = result.network;
      } else if (type === 'xbull') {
        const result = await connectXbull();
        publicKey = result.publicKey;
        network = result.network;
      } else {
        store.setError('Wallet type not yet supported.');
        return;
      }

      store.setAddress(publicKey);
      store.setNetwork(network);
      store.setWalletType(type);
      await loadBalances(
        publicKey,
        store.setBalance,
        store.setBstBalance,
        store.setBalanceError
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === 'FREIGHTER_NOT_CONNECTED') {
        store.setError('Connection cancelled.');
      } else {
        store.setError('Failed to connect wallet. Please try again.');
      }
    } finally {
      store.setIsConnecting(false);
    }
  }

  async function refreshBalances() {
    if (!store.address) return;
    await loadBalances(
      store.address,
      store.setBalance,
      store.setBstBalance,
      store.setBalanceError
    );
  }

  return {
    address: store.address,
    truncatedAddress: store.address ? truncateAddress(store.address) : null,
    network: store.network,
    networkMismatch,
    balance: store.balance,
    bstBalance: store.bstBalance,
    walletType: store.walletType,
    isConnecting: store.isConnecting,
    isConnected: !!store.address,
    error: store.error,
    balanceError: store.balanceError,
    connect,
    disconnect: store.disconnect,
    clearError: () => store.setError(null),
    refreshBalances,
  };
}
