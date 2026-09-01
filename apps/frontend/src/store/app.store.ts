/**
 * Consolidated app state store — issue #970
 *
 * Merges the three overlapping global-state sources for wallet, user (auth),
 * and network concerns into a single Zustand slice so there is no risk of
 * them diverging.
 *
 * Migration notes
 * ───────────────
 * • useAuthStore  → use useAppStore selectors: selectUser, selectToken, …
 * • useWalletStore → use useAppStore selectors: selectWallet*
 * • Network state was previously scattered across WalletProvider + hook
 *   local state; it now lives in `network`.
 *
 * The existing `useAuthStore` and `useWalletStore` are kept intact for
 * backward-compatibility with code not yet migrated.  New code should
 * import from this file.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { isTokenExpired } from '@/lib/jwt';
import type { WalletErrorState, WalletType } from '@/lib/wallet/types';

// ── Sub-slices (shapes only) ──────────────────────────────────────────────────

export interface AppUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string;
  stellarPublicKey?: string;
}

export interface WalletSlice {
  address: string | null;
  walletType: WalletType | null;
  balance: string | null;
  bstBalance: string | null;
  isConnecting: boolean;
  walletError: WalletErrorState | null;
  balanceError: boolean;
}

export interface NetworkSlice {
  /** Currently active network name, e.g. 'testnet' or 'mainnet'. */
  network: string | null;
  /** `true` when the wallet is on a different network than the app expects. */
  networkMismatch: boolean;
}

// ── Full store shape ──────────────────────────────────────────────────────────

export interface AppState {
  // ── Auth ──
  user: AppUser | null;
  token: string | null;
  /**
   * `false` until the persisted session has been read back from storage.
   * Guards prevent redirecting a signed-in user before hydration.
   */
  hasHydrated: boolean;

  // ── Wallet ──
  wallet: WalletSlice;

  // ── Network ──
  network: NetworkSlice;

  // ── Auth actions ──
  login: (token: string, user: AppUser) => void;
  logout: () => void;
  setUser: (user: AppUser) => void;
  setHasHydrated: (v: boolean) => void;

  // ── Wallet actions ──
  applyWalletConnection: (params: {
    address: string;
    network: string;
    walletType: WalletType;
    networkMismatch?: boolean;
  }) => void;
  disconnectWallet: () => void;
  setWalletBalances: (xlm: string | null, bst: string | null) => void;
  setWalletConnecting: (v: boolean) => void;
  setWalletError: (error: WalletErrorState | null) => void;
  setBalanceError: (v: boolean) => void;

  // ── Network actions ──
  setNetwork: (network: string | null) => void;
  setNetworkMismatch: (mismatch: boolean) => void;
}

// ── Initial wallet slice ──────────────────────────────────────────────────────

const INITIAL_WALLET: WalletSlice = {
  address: null,
  walletType: null,
  balance: null,
  bstBalance: null,
  isConnecting: false,
  walletError: null,
  balanceError: false,
};

const INITIAL_NETWORK: NetworkSlice = {
  network: null,
  networkMismatch: false,
};

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ── Auth initial state ──
      user: null,
      token: null,
      hasHydrated: false,

      // ── Wallet / network initial state ──
      wallet: INITIAL_WALLET,
      network: INITIAL_NETWORK,

      // ── Auth actions ──
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
      setUser: (user) => set({ user }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      // ── Wallet actions ──
      applyWalletConnection: ({ address, network, walletType, networkMismatch = false }) =>
        set((s) => ({
          wallet: {
            ...s.wallet,
            address,
            walletType,
            walletError: null,
            isConnecting: false,
          },
          network: { network, networkMismatch },
        })),

      disconnectWallet: () =>
        set({
          wallet: INITIAL_WALLET,
          network: INITIAL_NETWORK,
        }),

      setWalletBalances: (balance, bstBalance) =>
        set((s) => ({ wallet: { ...s.wallet, balance, bstBalance } })),

      setWalletConnecting: (isConnecting) =>
        set((s) => ({ wallet: { ...s.wallet, isConnecting } })),

      setWalletError: (walletError) => set((s) => ({ wallet: { ...s.wallet, walletError } })),

      setBalanceError: (balanceError) => set((s) => ({ wallet: { ...s.wallet, balanceError } })),

      // ── Network actions ──
      setNetwork: (network) => set((s) => ({ network: { ...s.network, network } })),

      setNetworkMismatch: (networkMismatch) =>
        set((s) => ({ network: { ...s.network, networkMismatch } })),
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      // Only persist the fields that must survive a page refresh.
      partialize: (s) => ({
        token: s.token,
        user: s.user,
        wallet: {
          address: s.wallet.address,
          walletType: s.wallet.walletType,
          // Do not persist derived/sensitive fields (balances, errors, isConnecting).
        },
        network: {
          network: s.network.network,
        },
      }),
      onRehydrateStorage: () => (state) => {
        // Drop sessions whose JWT has already expired.
        if (state?.token && isTokenExpired(state.token)) {
          state.logout();
        }
        state?.setHasHydrated(true);
      },
    }
  )
);

// ── Selectors ─────────────────────────────────────────────────────────────────
// Fine-grained selectors prevent unnecessary re-renders when unrelated slices change.

export const selectUser = (s: AppState) => s.user;
export const selectToken = (s: AppState) => s.token;
export const selectHasHydrated = (s: AppState) => s.hasHydrated;
export const selectIsAuthenticated = (s: AppState) => !!s.token;
export const selectIsAdmin = (s: AppState) => s.user?.role === 'admin';

export const selectWalletAddress = (s: AppState) => s.wallet.address;
export const selectWalletType = (s: AppState) => s.wallet.walletType;
export const selectWalletBalance = (s: AppState) => s.wallet.balance;
export const selectWalletBstBalance = (s: AppState) => s.wallet.bstBalance;
export const selectWalletIsConnecting = (s: AppState) => s.wallet.isConnecting;
export const selectWalletError = (s: AppState) => s.wallet.walletError;
export const selectWalletBalanceError = (s: AppState) => s.wallet.balanceError;
export const selectIsWalletConnected = (s: AppState) => !!s.wallet.address;

export const selectNetwork = (s: AppState) => s.network.network;
export const selectNetworkMismatch = (s: AppState) => s.network.networkMismatch;
