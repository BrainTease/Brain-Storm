import { describe, it, expect } from 'vitest';
import {
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  STELLAR_NETWORK,
  explorerTxUrl,
  isExpectedNetwork,
} from '@/lib/wallet';

describe('wallet network config', () => {
  it('defaults to testnet when no network is configured', () => {
    expect(STELLAR_NETWORK).toBe('testnet');
    expect(HORIZON_URL).toBe('https://horizon-testnet.stellar.org');
    expect(NETWORK_PASSPHRASE).toBe('Test SDF Network ; September 2015');
  });

  it('builds explorer links for the active network', () => {
    expect(explorerTxUrl('abc123')).toBe('https://stellar.expert/explorer/testnet/tx/abc123');
  });

  describe('isExpectedNetwork', () => {
    it('matches a plain network name', () => {
      expect(isExpectedNetwork('TESTNET', 'testnet')).toBe(true);
    });

    it('matches a full network passphrase', () => {
      expect(isExpectedNetwork('Test SDF Network ; September 2015', 'testnet')).toBe(true);
      expect(isExpectedNetwork('Public Global Stellar Network ; September 2015', 'mainnet')).toBe(
        true
      );
    });

    it('rejects a different network', () => {
      expect(isExpectedNetwork('PUBLIC', 'testnet')).toBe(false);
      expect(isExpectedNetwork('Test SDF Network ; September 2015', 'mainnet')).toBe(false);
    });

    it('treats an unknown network as matching so no false warning is shown', () => {
      expect(isExpectedNetwork(null, 'testnet')).toBe(true);
    });
  });
});
