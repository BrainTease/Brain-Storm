import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signTransaction, getNetworkForWallet } from '@/services/walletSigningService';
import * as walletApi from '@/lib/walletApi';
import * as walletAdapters from '@/lib/walletAdapters';

vi.mock('@/lib/walletApi');
vi.mock('@/lib/walletAdapters');

describe('walletSigningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signTransaction', () => {
    const testXdr = 'AAAAAgAAAABUI6QGgPSYPz/9C5nxAn2JzVSmSgc0GZhqMKnFhKU8yw==';

    it('should sign transaction with freighter wallet', async () => {
      const signedXdr = 'AAAAAgAAAABUI6QGgPSYPz/9C5nxAn2JzVSmSgc0GZhqMKnFhKU8yw==';
      vi.mocked(walletApi.signWithFreighter).mockResolvedValueOnce(signedXdr);

      const result = await signTransaction(testXdr, 'freighter');

      expect(result).toEqual({ signedXdr });
      expect(walletApi.signWithFreighter).toHaveBeenCalledWith(
        testXdr,
        expect.stringMatching(/MAINNET|TESTNET/)
      );
    });

    it('should sign transaction with albedo wallet', async () => {
      const signedXdr = 'signed_xdr_from_albedo';
      vi.mocked(walletAdapters.signWithAlbedo).mockResolvedValueOnce(signedXdr);

      const result = await signTransaction(testXdr, 'albedo');

      expect(result).toEqual({ signedXdr });
      expect(walletAdapters.signWithAlbedo).toHaveBeenCalledWith(testXdr);
    });

    it('should sign transaction with xbull wallet', async () => {
      const signedXdr = 'signed_xdr_from_xbull';
      vi.mocked(walletAdapters.signWithXbull).mockResolvedValueOnce(signedXdr);

      const result = await signTransaction(testXdr, 'xbull');

      expect(result).toEqual({ signedXdr });
      expect(walletAdapters.signWithXbull).toHaveBeenCalledWith(testXdr);
    });

    it('should throw error when no wallet is connected', async () => {
      try {
        await signTransaction(testXdr, null as any);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toEqual({
          code: 'NO_WALLET_CONNECTED',
          message: 'No wallet connected.',
        });
      }
    });

    it('should throw error for unsupported wallet type', async () => {
      try {
        await signTransaction(testXdr, 'walletconnect');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toEqual({
          code: 'UNSUPPORTED_WALLET',
          message: expect.stringContaining('not supported'),
        });
      }
    });

    it('should handle signing errors from wallet adapters', async () => {
      vi.mocked(walletApi.signWithFreighter).mockRejectedValueOnce(new Error('User rejected'));

      try {
        await signTransaction(testXdr, 'freighter');
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).toEqual({
          code: 'SIGNING_FAILED',
          message: 'User rejected',
        });
      }
    });
  });

  describe('getNetworkForWallet', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    });

    it('should get network for freighter wallet', async () => {
      const expectedNetwork = 'Test SDF Network ; September 2015';
      vi.mocked(walletApi.getFreighterNetwork).mockResolvedValueOnce(expectedNetwork);

      const result = await getNetworkForWallet('freighter');

      expect(result).toBe(expectedNetwork);
      expect(walletApi.getFreighterNetwork).toHaveBeenCalled();
    });

    it('should return testnet network for non-freighter wallets by default', async () => {
      const result = await getNetworkForWallet('albedo');

      expect(result).toBe('Test SDF Network ; September 2015');
    });

    it('should return mainnet network when configured', async () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'mainnet';

      const result = await getNetworkForWallet('xbull');

      expect(result).toBe('Public Global Stellar Network ; September 2015');
    });
  });
});
