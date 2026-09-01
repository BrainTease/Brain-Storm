/**
 * #1026 — Mobile wallet-flow integration tests
 *
 * Tests the MobileWalletService (connect, sign, disconnect, restore)
 * using mocked expo-linking and expo-secure-store bridges.
 *
 * These tests run without a physical device.
 */

import mockLinking from '../__mocks__/expo-linking';
import mockSecureStore from '../__mocks__/expo-secure-store';

jest.mock('expo-linking', () => require('../__mocks__/expo-linking'));
jest.mock('expo-secure-store', () => require('../__mocks__/expo-secure-store'));

// Import after mocks are set up
import { MobileWalletService } from '../../wallet/walletService';

describe('MobileWalletService', () => {
  let service: MobileWalletService;

  beforeEach(() => {
    mockLinking.__reset();
    mockSecureStore.__reset();
    service = new MobileWalletService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── connect ─────────────────────────────────────────────────────────────

  describe('connect', () => {
    it('opens stellar://connect URL via deep link', async () => {
      const connectPromise = service.connect();

      // Simulate wallet callback with publicKey
      const callbackUrl = mockLinking.openURL.mock.calls[0][0];
      const callbackBase = callbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${callbackBase}?publicKey=GBTEST1234567890`);

      const connection = await connectPromise;
      expect(mockLinking.openURL).toHaveBeenCalled();
      expect(connection.publicKey).toBe('GBTEST1234567890');
      expect(connection.provider).toBe('freighter');
    });

    it('stores publicKey in secure storage after connect', async () => {
      const connectPromise = service.connect();

      const callbackUrl = mockLinking.openURL.mock.calls[0][0];
      const callbackBase = callbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${callbackBase}?publicKey=GBABCDEF123456`);

      await connectPromise;
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'wallet_public_key',
        'GBABCDEF123456'
      );
    });

    it('rejects if callback has no publicKey', async () => {
      const connectPromise = service.connect();

      const callbackUrl = mockLinking.openURL.mock.calls[0][0];
      const callbackBase = callbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${callbackBase}?error=denied`);

      await expect(connectPromise).rejects.toThrow('Connection failed');
    });

    it('rejects after timeout (60s)', async () => {
      const connectPromise = service.connect();

      jest.advanceTimersByTime(60001);

      await expect(connectPromise).rejects.toThrow('Connection timeout');
    });
  });

  // ── signTransaction ─────────────────────────────────────────────────────

  describe('signTransaction', () => {
    it('throws if wallet not connected', async () => {
      await expect(service.signTransaction('mock-xdr')).rejects.toThrow(
        'Wallet not connected'
      );
    });

    it('opens stellar://sign URL and resolves with signedXdr', async () => {
      // First connect
      const connectPromise = service.connect();
      const callbackUrl = mockLinking.openURL.mock.calls[0][0];
      const callbackBase = callbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${callbackBase}?publicKey=GBKEY123`);
      await connectPromise;

      // Now sign
      mockLinking.__reset();
      const signPromise = service.signTransaction('AAAAAGL...');

      const signCallbackUrl = mockLinking.openURL.mock.calls[0][0];
      const signCallbackBase = signCallbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${signCallbackBase}?signedXdr=AAAA_SIGNED_XDR`);

      const signedXdr = await signPromise;
      expect(signedXdr).toBe('AAAA_SIGNED_XDR');
      expect(mockLinking.openURL).toHaveBeenCalled();
    });

    it('rejects if sign callback has no signedXdr', async () => {
      // Connect first
      const connectPromise = service.connect();
      const callbackUrl = mockLinking.openURL.mock.calls[0][0];
      const callbackBase = callbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${callbackBase}?publicKey=GBKEY`);
      await connectPromise;

      mockLinking.__reset();
      const signPromise = service.signTransaction('AAAA');

      const signCallbackUrl = mockLinking.openURL.mock.calls[0][0];
      const signCallbackBase = signCallbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${signCallbackBase}?error=user_cancelled`);

      await expect(signPromise).rejects.toThrow('Signing failed');
    });

    it('rejects after sign timeout (60s)', async () => {
      // Connect first
      const connectPromise = service.connect();
      const callbackUrl = mockLinking.openURL.mock.calls[0][0];
      const callbackBase = callbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${callbackBase}?publicKey=GBKEY`);
      await connectPromise;

      mockLinking.__reset();
      const signPromise = service.signTransaction('AAAA');

      jest.advanceTimersByTime(60001);

      await expect(signPromise).rejects.toThrow('Sign timeout');
    });
  });

  // ── disconnect ──────────────────────────────────────────────────────────

  describe('disconnect', () => {
    it('clears connection and removes from secure storage', async () => {
      // Connect first
      const connectPromise = service.connect();
      const callbackUrl = mockLinking.openURL.mock.calls[0][0];
      const callbackBase = callbackUrl.split('?')[0];
      mockLinking.__emitUrl(`${callbackBase}?publicKey=GBKEY`);
      await connectPromise;

      expect(service.getConnection()).not.toBeNull();

      await service.disconnect();

      expect(service.getConnection()).toBeNull();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('wallet_public_key');
    });
  });

  // ── restoreConnection ───────────────────────────────────────────────────

  describe('restoreConnection', () => {
    it('restores connection from secure storage', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce('GBRESTOREDKEY');

      const restored = await service.restoreConnection();
      expect(restored).toEqual({
        publicKey: 'GBRESTOREDKEY',
        provider: 'freighter',
      });
      expect(service.getConnection()).toEqual(restored);
    });

    it('returns null if no stored key', async () => {
      mockSecureStore.getItemAsync.mockResolvedValueOnce(null);

      const restored = await service.restoreConnection();
      expect(restored).toBeNull();
    });
  });

  // ── getConnection ───────────────────────────────────────────────────────

  describe('getConnection', () => {
    it('returns null before connect', () => {
      expect(service.getConnection()).toBeNull();
    });
  });
});
