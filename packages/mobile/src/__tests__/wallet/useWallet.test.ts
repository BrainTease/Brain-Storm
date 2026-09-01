/**
 * #1026 — Mobile useWallet hook integration tests
 *
 * Tests the useWallet hook which wraps MobileWalletService.
 * Uses mocked expo-linking and expo-secure-store.
 */

import mockLinking from '../../__mocks__/expo-linking';
import mockSecureStore from '../../__mocks__/expo-secure-store';

jest.mock('expo-linking', () => require('../../__mocks__/expo-linking'));
jest.mock('expo-secure-store', () => require('../../__mocks__/expo-secure-store'));

import { renderHook, act } from '@testing-library/react-hooks';
import { useWallet } from '../../../wallet/useWallet';

describe('useWallet hook', () => {
  beforeEach(() => {
    mockLinking.__reset();
    mockSecureStore.__reset();
  });

  describe('connect', () => {
    it('sets connection on successful connect', async () => {
      const { result, waitForNextUpdate } = renderHook(() => useWallet());

      expect(result.current.connection).toBeNull();
      expect(result.current.connecting).toBe(false);

      const connectPromise = result.current.connect();

      // Simulate callback
      await act(async () => {
        const callbackUrl = mockLinking.openURL.mock.calls[0][0];
        const callbackBase = callbackUrl.split('?')[0];
        mockLinking.__emitUrl(`${callbackBase}?publicKey=GBTESTKEY`);
      });

      await connectPromise;

      expect(result.current.connection).toEqual({
        publicKey: 'GBTESTKEY',
        provider: 'freighter',
      });
      expect(result.current.connecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets error on connection failure', async () => {
      const { result } = renderHook(() => useWallet());

      const connectPromise = result.current.connect();

      await act(async () => {
        const callbackUrl = mockLinking.openURL.mock.calls[0][0];
        const callbackBase = callbackUrl.split('?')[0];
        mockLinking.__emitUrl(`${callbackBase}?error=denied`);
      });

      await expect(connectPromise).resolves.toBeUndefined();
      expect(result.current.error).toBe('Connection failed');
      expect(result.current.connection).toBeNull();
    });
  });

  describe('disconnect', () => {
    it('clears connection after disconnect', async () => {
      const { result } = renderHook(() => useWallet());

      // Connect first
      const connectPromise = result.current.connect();
      await act(async () => {
        const callbackUrl = mockLinking.openURL.mock.calls[0][0];
        const callbackBase = callbackUrl.split('?')[0];
        mockLinking.__emitUrl(`${callbackBase}?publicKey=GBKEY123`);
      });
      await connectPromise;

      expect(result.current.connection).not.toBeNull();

      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.connection).toBeNull();
    });
  });

  describe('signAndSubmit', () => {
    it('throws if wallet not connected', async () => {
      const { result } = renderHook(() => useWallet());

      await expect(result.current.signAndSubmit('mock-xdr')).rejects.toThrow(
        'Wallet not connected'
      );
    });
  });

  describe('restoreConnection on mount', () => {
    it('restores connection from secure storage on mount', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('GBRESTORED');

      const { result, waitForNextUpdate } = renderHook(() => useWallet());

      await waitForNextUpdate();

      expect(result.current.connection).toEqual({
        publicKey: 'GBRESTORED',
        provider: 'freighter',
      });
    });
  });
});
