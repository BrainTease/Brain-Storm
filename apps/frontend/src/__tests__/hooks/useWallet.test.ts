import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWallet } from '@/hooks/useWallet';

vi.mock('@/lib/walletApi', () => ({
  isFreighterInstalled: vi.fn(() => true),
  connectFreighter: vi.fn(() => Promise.resolve({ publicKey: 'GPUBKEY', network: 'testnet' })),
  fetchXlmBalance: vi.fn(() => Promise.resolve('100.0')),
  fetchBstBalance: vi.fn(() => Promise.resolve('50.0')),
  truncateAddress: (addr: string) => `${addr.slice(0, 4)}…${addr.slice(-4)}`,
}));

vi.mock('@/lib/walletAdapters', () => ({
  connectAlbedo: vi.fn(),
  connectXbull: vi.fn(),
  SUPPORTED_WALLETS: [],
}));

// Reset Zustand store between tests
beforeEach(async () => {
  const { useWalletStore } = await import('@/store/walletStore');
  useWalletStore.getState().disconnect();
});

describe('useWallet', () => {
  it('starts disconnected', () => {
    const { result } = renderHook(() => useWallet());
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
  });

  it('connects with freighter and populates address and balances', async () => {
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('GPUBKEY');
    expect(result.current.balance).toBe('100.0');
    expect(result.current.bstBalance).toBe('50.0');
    expect(result.current.network).toBe('testnet');
  });

  it('truncates address', async () => {
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.truncatedAddress).toBe('GPUB…BKEY');
  });

  it('disconnects and clears state', async () => {
    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('freighter');
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.balance).toBeNull();
  });

  it('sets error when freighter not installed', async () => {
    const walletApi = await import('@/lib/walletApi');
    vi.mocked(walletApi.isFreighterInstalled).mockReturnValueOnce(false);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('freighter');
    });

    expect(result.current.error).toBe('FREIGHTER_NOT_INSTALLED');
    expect(result.current.isConnected).toBe(false);
  });

  it('clears error on clearError', async () => {
    const walletApi = await import('@/lib/walletApi');
    vi.mocked(walletApi.isFreighterInstalled).mockReturnValueOnce(false);

    const { result } = renderHook(() => useWallet());

    await act(async () => {
      await result.current.connect('freighter');
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
