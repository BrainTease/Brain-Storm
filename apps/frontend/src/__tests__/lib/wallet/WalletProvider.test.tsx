import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { WalletProvider, useWallet, useWalletStore } from '@/lib/wallet';
import { WalletError } from '@/lib/wallet/types';

const connectFreighter = vi.fn(() =>
  Promise.resolve({ publicKey: 'GPUBKEYABCDEF', network: 'TESTNET' })
);
const signFreighter = vi.fn(() => Promise.resolve('SIGNED_XDR'));

vi.mock('@/lib/wallet/adapters', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wallet/adapters')>();
  const freighter = {
    ...actual.freighterAdapter,
    connect: () => connectFreighter(),
    sign: (xdr: string) => signFreighter(xdr),
  };
  return {
    ...actual,
    freighterAdapter: freighter,
    WALLET_ADAPTERS: { ...actual.WALLET_ADAPTERS, freighter },
    getWalletAdapter: (type: string) =>
      type === 'freighter' ? freighter : actual.getWalletAdapter(type as never),
  };
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <WalletProvider>{children}</WalletProvider>
);

function mockBalances(xlm: string, bst: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            balances: [
              { asset_type: 'native', balance: xlm },
              { asset_type: 'credit_alphanum4', asset_code: 'BST', balance: bst },
            ],
          }),
      } as Response)
    )
  );
}

beforeEach(() => {
  useWalletStore.getState().disconnect();
  connectFreighter.mockClear();
  signFreighter.mockClear();
  mockBalances('100.0', '50.0');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('WalletProvider', () => {
  it('requires consumers to be inside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useWallet())).toThrowError(
      /must be used within a WalletProvider/
    );
    spy.mockRestore();
  });

  it('starts disconnected', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.adapter).toBeNull();
  });

  it('connects, records the adapter and loads balances', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('GPUBKEYABCDEF');
    expect(result.current.truncatedAddress).toBe('GPUB…CDEF');
    expect(result.current.network).toBe('TESTNET');
    expect(result.current.balance).toBe('100.0');
    expect(result.current.bstBalance).toBe('50.0');
    expect(result.current.walletType).toBe('freighter');
    expect(result.current.adapter?.name).toBe('Freighter');
  });

  it('defaults to Freighter when no wallet type is given', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await result.current.connect();
    });
    expect(connectFreighter).toHaveBeenCalledTimes(1);
    expect(result.current.walletType).toBe('freighter');
  });

  it('disconnects and clears connection state', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });
    act(() => result.current.disconnect());

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.balance).toBeNull();
    expect(result.current.adapter).toBeNull();
  });

  it('surfaces a coded error when the wallet is not installed', async () => {
    connectFreighter.mockRejectedValueOnce(
      new WalletError('NOT_INSTALLED', 'Freighter is not installed.', 'freighter')
    );
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.error).toEqual({
      code: 'NOT_INSTALLED',
      message: 'Freighter is not installed.',
      walletId: 'freighter',
    });
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isConnecting).toBe(false);
  });

  it('normalises an unexpected failure into an UNKNOWN error', async () => {
    connectFreighter.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.error).toMatchObject({ code: 'UNKNOWN', message: 'boom' });
  });

  it('clears the error on request', async () => {
    connectFreighter.mockRejectedValueOnce(new WalletError('NOT_INSTALLED', 'nope', 'freighter'));
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });
    act(() => result.current.clearError());

    expect(result.current.error).toBeNull();
  });

  it('flags a network mismatch when the wallet is on another network', async () => {
    connectFreighter.mockResolvedValueOnce({ publicKey: 'GPUBKEYABCDEF', network: 'PUBLIC' });
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.networkMismatch).toBe(true);
  });

  it('records a balance error without dropping the connection', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false } as Response))
    );
    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.balanceError).toBe(true);
    expect(result.current.balance).toBeNull();
  });

  it('refreshes balances for the connected address', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await result.current.connect('freighter');
    });

    mockBalances('200.0', '75.0');
    await act(async () => {
      await result.current.refreshBalances();
    });

    expect(result.current.balance).toBe('200.0');
    expect(result.current.bstBalance).toBe('75.0');
  });

  it('ignores a refresh while disconnected', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await result.current.refreshBalances();
    });
    expect(result.current.balance).toBeNull();
  });

  it('delegates signing to the connected adapter', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await result.current.connect('freighter');
    });

    await expect(result.current.signTransaction('XDR')).resolves.toBe('SIGNED_XDR');
    expect(signFreighter).toHaveBeenCalledWith('XDR');
  });

  it('refuses to sign when no wallet is connected', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    await expect(result.current.signTransaction('XDR')).rejects.toMatchObject({
      code: 'NO_WALLET_CONNECTED',
    });
  });

  it('loads balances for a session restored from storage', async () => {
    useWalletStore.setState({ address: 'GPUBKEYABCDEF', walletType: 'freighter' });

    const { result } = renderHook(() => useWallet(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.balance).toBe('100.0');
    expect(connectFreighter).not.toHaveBeenCalled();
  });
});
