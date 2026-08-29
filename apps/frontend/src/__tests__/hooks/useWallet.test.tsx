import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWallet } from '@/hooks/useWallet';
import * as walletModule from '@/lib/wallet';

vi.mock('@/lib/wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wallet')>();
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

describe('useWallet hook (SDK-backed)', () => {
  it('exposes core wallet state and SDK balance helper', async () => {
    const mockCoreWallet = {
      address: 'GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7',
      truncatedAddress: 'GBQW…WVT7',
      network: 'TESTNET',
      networkMismatch: false,
      balance: '250.00',
      bstBalance: '100.00',
      isConnected: true,
      isConnecting: false,
      error: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      refreshBalances: vi.fn(),
      signTransaction: vi.fn(),
      clearError: vi.fn(),
    };

    vi.mocked(walletModule.useWallet).mockReturnValue(mockCoreWallet as any);

    const { result } = renderHook(() => useWallet());

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7');
    expect(result.current.truncatedAddress).toBe('GBQW…WVT7');
    expect(typeof result.current.fetchSdkStellarBalance).toBe('function');
  });
});
