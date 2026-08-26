/**
 * Unit tests for the consolidated app store — issue #970
 *
 * ⚠️ DO NOT RUN — implementation only, per task instructions.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock jwt module to control expiry checks
vi.mock('@/lib/jwt', () => ({
  isTokenExpired: vi.fn(() => false),
}));

import { useAppStore } from '@/store/app.store';
import {
  selectUser,
  selectToken,
  selectIsAuthenticated,
  selectIsAdmin,
  selectWalletAddress,
  selectWalletBalance,
  selectWalletBstBalance,
  selectIsWalletConnected,
  selectNetwork,
  selectNetworkMismatch,
} from '@/store/app.store';

function getState() {
  return useAppStore.getState();
}

function resetStore() {
  useAppStore.setState({
    user: null,
    token: null,
    hasHydrated: false,
    wallet: {
      address: null,
      walletType: null,
      balance: null,
      bstBalance: null,
      isConnecting: false,
      walletError: null,
      balanceError: false,
    },
    network: { network: null, networkMismatch: false },
  });
}

describe('useAppStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ── Auth slice ─────────────────────────────────────────────────────────────

  describe('auth slice', () => {
    it('login sets token and user', () => {
      const user = {
        id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        role: 'student',
      };
      getState().login('my-jwt', user);
      const s = getState();
      expect(selectToken(s)).toBe('my-jwt');
      expect(selectUser(s)).toEqual(user);
    });

    it('logout clears token and user', () => {
      const user = { id: 'u1', username: 'alice', email: 'alice@example.com', role: 'student' };
      getState().login('my-jwt', user);
      getState().logout();
      const s = getState();
      expect(selectToken(s)).toBeNull();
      expect(selectUser(s)).toBeNull();
    });

    it('setUser updates the user without touching the token', () => {
      getState().login('my-jwt', {
        id: 'u1',
        username: 'alice',
        email: 'alice@example.com',
        role: 'student',
      });
      getState().setUser({
        id: 'u1',
        username: 'alice-updated',
        email: 'alice@example.com',
        role: 'student',
      });
      const s = getState();
      expect(selectUser(s)?.username).toBe('alice-updated');
      expect(selectToken(s)).toBe('my-jwt');
    });

    it('selectIsAuthenticated is true when token is set', () => {
      getState().login('tok', { id: 'u1', username: 'u', email: 'u@e.com', role: 'student' });
      expect(selectIsAuthenticated(getState())).toBe(true);
    });

    it('selectIsAuthenticated is false when logged out', () => {
      expect(selectIsAuthenticated(getState())).toBe(false);
    });

    it('selectIsAdmin is true only when role is admin', () => {
      getState().login('tok', { id: 'u1', username: 'u', email: 'u@e.com', role: 'admin' });
      expect(selectIsAdmin(getState())).toBe(true);
    });

    it('selectIsAdmin is false for non-admin roles', () => {
      getState().login('tok', { id: 'u1', username: 'u', email: 'u@e.com', role: 'student' });
      expect(selectIsAdmin(getState())).toBe(false);
    });
  });

  // ── Wallet slice ───────────────────────────────────────────────────────────

  describe('wallet slice', () => {
    it('applyWalletConnection stores address, walletType, and network', () => {
      getState().applyWalletConnection({
        address: 'GABC123',
        network: 'testnet',
        walletType: 'freighter',
      });
      const s = getState();
      expect(selectWalletAddress(s)).toBe('GABC123');
      expect(selectNetwork(s)).toBe('testnet');
      expect(selectIsWalletConnected(s)).toBe(true);
    });

    it('applyWalletConnection clears wallet error', () => {
      useAppStore.setState((s) => ({
        wallet: {
          ...s.wallet,
          walletError: { code: 'CONNECTION_REJECTED', message: 'Rejected' },
        },
      }));
      getState().applyWalletConnection({
        address: 'GABC123',
        network: 'testnet',
        walletType: 'freighter',
      });
      expect(getState().wallet.walletError).toBeNull();
    });

    it('disconnectWallet resets all wallet + network fields', () => {
      getState().applyWalletConnection({
        address: 'GABC123',
        network: 'testnet',
        walletType: 'freighter',
      });
      getState().setWalletBalances('100', '50');
      getState().disconnectWallet();
      const s = getState();
      expect(selectWalletAddress(s)).toBeNull();
      expect(selectWalletBalance(s)).toBeNull();
      expect(selectWalletBstBalance(s)).toBeNull();
      expect(selectNetwork(s)).toBeNull();
    });

    it('setWalletBalances updates xlm and bst balances', () => {
      getState().setWalletBalances('250.50', '10');
      const s = getState();
      expect(selectWalletBalance(s)).toBe('250.50');
      expect(selectWalletBstBalance(s)).toBe('10');
    });

    it('setWalletConnecting toggles isConnecting', () => {
      getState().setWalletConnecting(true);
      expect(getState().wallet.isConnecting).toBe(true);
      getState().setWalletConnecting(false);
      expect(getState().wallet.isConnecting).toBe(false);
    });

    it('setWalletError stores the error state', () => {
      getState().setWalletError({ code: 'NOT_INSTALLED', message: 'Freighter not installed' });
      expect(getState().wallet.walletError?.code).toBe('NOT_INSTALLED');
    });

    it('setWalletError(null) clears the error', () => {
      getState().setWalletError({ code: 'NOT_INSTALLED', message: 'x' });
      getState().setWalletError(null);
      expect(getState().wallet.walletError).toBeNull();
    });
  });

  // ── Network slice ──────────────────────────────────────────────────────────

  describe('network slice', () => {
    it('setNetwork updates the active network', () => {
      getState().setNetwork('mainnet');
      expect(selectNetwork(getState())).toBe('mainnet');
    });

    it('setNetworkMismatch flags a mismatch', () => {
      getState().setNetworkMismatch(true);
      expect(selectNetworkMismatch(getState())).toBe(true);
    });

    it('applyWalletConnection propagates networkMismatch flag', () => {
      getState().applyWalletConnection({
        address: 'GABC',
        network: 'public',
        walletType: 'freighter',
        networkMismatch: true,
      });
      expect(selectNetworkMismatch(getState())).toBe(true);
    });
  });

  // ── Cross-slice invariants ─────────────────────────────────────────────────

  describe('cross-slice invariants', () => {
    it('wallet disconnect does not affect auth state', () => {
      getState().login('tok', { id: 'u1', username: 'u', email: 'u@e.com', role: 'student' });
      getState().applyWalletConnection({
        address: 'GABC',
        network: 'testnet',
        walletType: 'freighter',
      });
      getState().disconnectWallet();
      // Auth state must still be intact
      expect(selectToken(getState())).toBe('tok');
      expect(selectUser(getState())?.username).toBe('u');
    });

    it('logout does not affect wallet state', () => {
      getState().applyWalletConnection({
        address: 'GABC',
        network: 'testnet',
        walletType: 'freighter',
      });
      getState().login('tok', { id: 'u1', username: 'u', email: 'u@e.com', role: 'student' });
      getState().logout();
      // Wallet must still be connected
      expect(selectWalletAddress(getState())).toBe('GABC');
    });
  });
});
