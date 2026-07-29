/**
 * Issue #844 — Unit tests for the `useWallet()` hook
 *
 * `useWallet()` is a context hook exported from `@/lib/wallet/WalletProvider`.
 * It is backed by `useWalletStore` (Zustand) and delegates all adapter calls
 * to the adapters registered in `@/lib/wallet/adapters`.
 *
 * Strategy:
 *  - Render a minimal `WalletProvider` wrapper so `useWallet()` has valid context.
 *  - Reset `useWalletStore` state before each test to keep tests independent.
 *  - Mock the adapter layer (`@/lib/wallet/adapters`) so no real Freighter
 *    extension or network requests are needed.
 *  - Mock `fetchBalances` (`@/lib/wallet/balances`) to keep tests synchronous.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';

// ── Module mocks (hoisted before imports that resolve them) ──────────────────

vi.mock('@/lib/wallet/balances', () => ({
  fetchBalances: vi.fn(),
}));

vi.mock('@/lib/wallet/adapters', () => ({
  getWalletAdapter: vi.fn(),
  SUPPORTED_WALLETS: [
    {
      id: 'freighter',
      name: 'Freighter',
      description: 'Freighter browser extension',
      installUrl: 'https://freighter.app',
      helpUrl: 'https://freighter.app/help',
      enabled: true,
    },
  ],
  WALLET_ADAPTERS: {},
  freighterAdapter: {},
  albedoAdapter: {},
  xbullAdapter: {},
  walletConnectAdapter: {},
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { WalletProvider, useWallet } from '@/lib/wallet/WalletProvider';
import { useWalletStore } from '@/lib/wallet/walletStore';
import { fetchBalances } from '@/lib/wallet/balances';
import { getWalletAdapter } from '@/lib/wallet/adapters';
import { WalletError } from '@/lib/wallet/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_PUBLIC_KEY = 'GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7';
const MOCK_NETWORK = 'TESTNET';

function buildMockAdapter(overrides: Partial<ReturnType<typeof makeMockAdapter>> = {}) {
  return makeMockAdapter(overrides);
}

function makeMockAdapter(overrides = {}) {
  return {
    id: 'freighter' as const,
    name: 'Freighter',
    description: 'Freighter browser extension',
    installUrl: 'https://freighter.app',
    helpUrl: 'https://freighter.app/help',
    enabled: true,
    isInstalled: vi.fn(() => true),
    connect: vi.fn(async () => ({ publicKey: MOCK_PUBLIC_KEY, network: MOCK_NETWORK })),
    sign: vi.fn(async (xdr: string) => `signed:${xdr}`),
    ...overrides,
  };
}

/** Wrapper component that provides wallet context. */
function wrapper({ children }: { children: ReactNode }) {
  return React.createElement(WalletProvider, null, children);
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset the Zustand store to a pristine disconnected state
  useWalletStore.setState({
    address: null,
    network: null,
    balance: null,
    bstBalance: null,
    walletType: null,
    isConnecting: false,
    error: null,
    balanceError: false,
  });

  // Default: fetchBalances returns a healthy balance
  (fetchBalances as Mock).mockResolvedValue({ xlm: '100.0000000', bst: '500' });

  // Default: getWalletAdapter returns the mock Freighter adapter
  (getWalletAdapter as Mock).mockReturnValue(buildMockAdapter());
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useWallet — initial disconnected state', () => {
  it('starts with a null address when no session is persisted', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    expect(result.current.address).toBeNull();
    expect(result.current.isConnected).toBe(false);
    expect(result.current.truncatedAddress).toBeNull();
    expect(result.current.network).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.bstBalance).toBeNull();
    expect(result.current.walletType).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it('reports networkMismatch as false when no network is set', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.networkMismatch).toBe(false);
  });

  it('exposes the connect, disconnect, signTransaction, refreshBalances, and clearError actions', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.signTransaction).toBe('function');
    expect(typeof result.current.refreshBalances).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });
});

describe('useWallet — successful wallet connection', () => {
  it('transitions to connected state after a successful connect()', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe(MOCK_PUBLIC_KEY);
    expect(result.current.walletType).toBe('freighter');
    expect(result.current.network).toBe(MOCK_NETWORK);
    expect(result.current.error).toBeNull();
    expect(result.current.isConnecting).toBe(false);
  });

  it('populates truncatedAddress after connection', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    // truncateAddress produces "GBQW…VT7" style
    expect(result.current.truncatedAddress).toMatch(/^G.+\.\.\..*$/);
  });

  it('loads XLM and BST balances after a successful connect', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    await waitFor(() => {
      expect(result.current.balance).toBe('100.0000000');
      expect(result.current.bstBalance).toBe('500');
    });
  });

  it('clears isConnecting flag after connection resolves', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    // Capture the connecting state while the promise is in flight
    let connectingDuringCall = false;
    const adapter = buildMockAdapter({
      connect: vi.fn(async () => {
        connectingDuringCall = useWalletStore.getState().isConnecting;
        return { publicKey: MOCK_PUBLIC_KEY, network: MOCK_NETWORK };
      }),
    });
    (getWalletAdapter as Mock).mockReturnValue(adapter);

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(connectingDuringCall).toBe(true);
    expect(result.current.isConnecting).toBe(false);
  });

  it('sets networkMismatch to false when connected to expected network (TESTNET)', async () => {
    // Ensure NEXT_PUBLIC_STELLAR_NETWORK is testnet (default in tests)
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    // MOCK_NETWORK === 'TESTNET' → should match the default testnet config
    expect(result.current.networkMismatch).toBe(false);
  });
});

describe('useWallet — account switching', () => {
  it('updates address and balances when a second connect() is called', async () => {
    const SECOND_KEY = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGBDZT7KFKHIUVN5FI7NXX';

    const { result } = renderHook(() => useWallet(), { wrapper });

    // First connection
    await act(async () => {
      await result.current.connect('freighter');
    });
    expect(result.current.address).toBe(MOCK_PUBLIC_KEY);

    // Switch account — second call with a different adapter response
    (getWalletAdapter as Mock).mockReturnValue(
      buildMockAdapter({
        connect: vi.fn(async () => ({ publicKey: SECOND_KEY, network: MOCK_NETWORK })),
      }),
    );

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.address).toBe(SECOND_KEY);
  });
});

describe('useWallet — disconnect and session cleanup', () => {
  it('clears all state after disconnect()', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });
    expect(result.current.isConnected).toBe(true);

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.network).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.bstBalance).toBeNull();
    expect(result.current.walletType).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets networkMismatch back to false after disconnect', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.networkMismatch).toBe(false);
  });
});

describe('useWallet — wallet extension not installed', () => {
  it('sets a NOT_INSTALLED error when Freighter adapter throws', async () => {
    (getWalletAdapter as Mock).mockReturnValue(
      buildMockAdapter({
        connect: vi.fn(async () => {
          throw new WalletError('NOT_INSTALLED', 'Freighter extension not found.', 'freighter');
        }),
      }),
    );

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe('NOT_INSTALLED');
    expect(result.current.error?.walletId).toBe('freighter');
  });

  it('exposes adapter metadata (install URL) when wallet is not installed', async () => {
    // The adapter property on the context value is set based on walletType.
    // After a NOT_INSTALLED failure, walletType stays null so adapter is null.
    (getWalletAdapter as Mock).mockReturnValue(
      buildMockAdapter({
        connect: vi.fn(async () => {
          throw new WalletError('NOT_INSTALLED', 'Freighter extension not found.', 'freighter');
        }),
      }),
    );

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    // The WalletButton component reads error.walletId to find the install URL
    expect(result.current.error?.walletId).toBe('freighter');
    expect(result.current.error?.message).toMatch(/not found/i);
  });

  it('clears the error after clearError() is called', async () => {
    (getWalletAdapter as Mock).mockReturnValue(
      buildMockAdapter({
        connect: vi.fn(async () => {
          throw new WalletError('NOT_INSTALLED', 'Freighter extension not found.', 'freighter');
        }),
      }),
    );

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.error).not.toBeNull();

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});

describe('useWallet — connection rejection / user cancellation', () => {
  it('sets CONNECTION_REJECTED error when the user cancels the wallet prompt', async () => {
    (getWalletAdapter as Mock).mockReturnValue(
      buildMockAdapter({
        connect: vi.fn(async () => {
          throw new WalletError('CONNECTION_REJECTED', 'User rejected the connection request.', 'freighter');
        }),
      }),
    );

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.error?.code).toBe('CONNECTION_REJECTED');
    expect(result.current.isConnecting).toBe(false);
  });
});

describe('useWallet — network / chain ID mismatch', () => {
  it('reports networkMismatch when wallet is on MAINNET but app expects TESTNET', async () => {
    (getWalletAdapter as Mock).mockReturnValue(
      buildMockAdapter({
        connect: vi.fn(async () => ({
          publicKey: MOCK_PUBLIC_KEY,
          network: 'PUBLIC', // Mainnet passphrase keyword
        })),
      }),
    );

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    // isConnected is true but the network is wrong
    expect(result.current.isConnected).toBe(true);
    expect(result.current.networkMismatch).toBe(true);
  });

  it('reports no mismatch when wallet reports the full TESTNET passphrase', async () => {
    (getWalletAdapter as Mock).mockReturnValue(
      buildMockAdapter({
        connect: vi.fn(async () => ({
          publicKey: MOCK_PUBLIC_KEY,
          network: 'Test SDF Network ; September 2015',
        })),
      }),
    );

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.networkMismatch).toBe(false);
  });
});

describe('useWallet — balance fetch failure', () => {
  it('sets balanceError when fetchBalances throws', async () => {
    (fetchBalances as Mock).mockRejectedValue(new Error('Horizon unreachable'));

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    await waitFor(() => {
      expect(result.current.balanceError).toBe(true);
      expect(result.current.balance).toBeNull();
      expect(result.current.bstBalance).toBeNull();
    });

    // The connection itself should still succeed
    expect(result.current.isConnected).toBe(true);
  });

  it('recovers balances on a subsequent refreshBalances() call', async () => {
    // First call fails
    (fetchBalances as Mock)
      .mockRejectedValueOnce(new Error('Horizon unreachable'))
      .mockResolvedValue({ xlm: '42.0000000', bst: '99' });

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    await waitFor(() => expect(result.current.balanceError).toBe(true));

    await act(async () => {
      await result.current.refreshBalances();
    });

    await waitFor(() => {
      expect(result.current.balanceError).toBe(false);
      expect(result.current.balance).toBe('42.0000000');
      expect(result.current.bstBalance).toBe('99');
    });
  });
});

describe('useWallet — signTransaction', () => {
  it('signs a transaction XDR via the connected adapter', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    let signed: string | undefined;
    await act(async () => {
      signed = await result.current.signTransaction('MOCK_XDR_PAYLOAD');
    });

    expect(signed).toBe('signed:MOCK_XDR_PAYLOAD');
  });

  it('throws NO_WALLET_CONNECTED when signTransaction is called without a connection', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await expect(
      act(async () => {
        await result.current.signTransaction('MOCK_XDR_PAYLOAD');
      }),
    ).rejects.toThrow(/no wallet connected/i);
  });
});

describe('useWallet — used outside WalletProvider', () => {
  it('throws a descriptive error when consumed outside of WalletProvider', () => {
    // Suppress the expected React error output
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useWallet());
    }).toThrow('useWallet must be used within a WalletProvider');

    consoleError.mockRestore();
  });
});
