import { describe, it, expect } from 'vitest';
import { assertNetworkConsistency } from '../network-consistency';
import { getStellarNetworkConfig } from '@brain-storm/sdk';

describe('assertNetworkConsistency (#1218)', () => {
  it('passes when network is known and no overrides', () => {
    expect(() => assertNetworkConsistency({ network: 'testnet' })).not.toThrow();
    expect(() => assertNetworkConsistency({ network: 'mainnet' })).not.toThrow();
  });

  it('defaults to testnet when network is missing', () => {
    expect(() => assertNetworkConsistency({})).not.toThrow();
  });

  it('rejects unknown network', () => {
    expect(() => assertNetworkConsistency({ network: 'devnet' })).toThrow(/Unknown STELLAR_NETWORK/);
  });

  it('rejects passphrase mismatch', () => {
    expect(() =>
      assertNetworkConsistency({ network: 'testnet', passphrase: 'Public Global Stellar Network ; September 2015' }),
    ).toThrow(/Passphrase mismatch/);
  });

  it('accepts matching passphrase', () => {
    const shared = getStellarNetworkConfig('testnet');
    expect(() =>
      assertNetworkConsistency({ network: 'testnet', passphrase: shared.passphrase }),
    ).not.toThrow();
  });

  it('rejects Horizon URL pointing at the wrong network', () => {
    const wrong = getStellarNetworkConfig('mainnet').horizonUrl;
    expect(() =>
      assertNetworkConsistency({ network: 'testnet', horizonUrl: wrong }),
    ).toThrow(/Horizon URL mismatch/);
  });

  it('rejects Soroban RPC URL pointing at the wrong network', () => {
    const wrong = getStellarNetworkConfig('mainnet').sorobanRpcUrl;
    expect(() =>
      assertNetworkConsistency({ network: 'testnet', sorobanRpcUrl: wrong }),
    ).toThrow(/Soroban RPC URL mismatch/);
  });

  it('accepts correct URLs for the network', () => {
    const shared = getStellarNetworkConfig('mainnet');
    expect(() =>
      assertNetworkConsistency({
        network: 'mainnet',
        horizonUrl: shared.horizonUrl,
        sorobanRpcUrl: shared.sorobanRpcUrl,
      }),
    ).not.toThrow();
  });
});
