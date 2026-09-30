/**
 * transaction-signing.test.ts — Issue #1018
 *
 * Unit tests for the Brain-Storm SDK transaction-signing helpers.
 *
 * All Stellar SDK responses are mocked; no live network calls are made.
 * The test suite covers:
 *  - requireWalletConnected
 *  - getWalletPublicKey
 *  - signTransaction (success, rejection, error-mapping, invalid return)
 *  - submitTransaction (success, non-SUCCESS status, empty XDR)
 *  - signAndSubmitTransaction (full happy-path and failure cascade)
 *  - mapTransactionError (all known codes + unknowns)
 *  - Error class name properties
 *
 * Issue #1182 additions:
 *  - Multi-signature transaction signing edge cases
 *  - Expired timebounds handling
 *  - Malformed XDR input handling
 */

import {
  requireWalletConnected,
  getWalletPublicKey,
  signTransaction,
  submitTransaction,
  signAndSubmitTransaction,
  mapTransactionError,
  TransactionSubmitError,
  WalletRejectionError,
  WalletNotConnectedError,
  FreighterAdapter,
  StellarSubmitAdapter,
  TransactionResult,
} from './transaction-signing';

// ─── Factories ────────────────────────────────────────────────────────────────

const VALID_PUBLIC_KEY = 'GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7';
const SAMPLE_XDR = 'AAAAAgAAAABhello==';
const SIGNED_XDR = 'AAAAAgAAAABsigned==';

function makeWallet(overrides: Partial<FreighterAdapter> = {}): FreighterAdapter {
  return {
    isConnected: jest.fn().mockResolvedValue(true),
    getPublicKey: jest.fn().mockResolvedValue(VALID_PUBLIC_KEY),
    signTransaction: jest.fn().mockResolvedValue(SIGNED_XDR),
    ...overrides,
  };
}

function makeSubmit(overrides: Partial<StellarSubmitAdapter> = {}): StellarSubmitAdapter {
  return {
    submitTransaction: jest.fn().mockResolvedValue({
      hash: 'abc123',
      status: 'SUCCESS',
      ledger: 1234,
    } satisfies TransactionResult),
    ...overrides,
  };
}

// ─── requireWalletConnected ───────────────────────────────────────────────────

describe('requireWalletConnected', () => {
  it('resolves when isConnected returns true', async () => {
    const adapter = makeWallet();
    await expect(requireWalletConnected(adapter)).resolves.toBeUndefined();
  });

  it('throws WalletNotConnectedError when isConnected returns false', async () => {
    const adapter = makeWallet({ isConnected: jest.fn().mockResolvedValue(false) });
    await expect(requireWalletConnected(adapter)).rejects.toThrow(WalletNotConnectedError);
    await expect(requireWalletConnected(adapter)).rejects.toThrow('Wallet not connected');
  });
});

// ─── getWalletPublicKey ───────────────────────────────────────────────────────

describe('getWalletPublicKey', () => {
  it('returns the public key from a connected wallet', async () => {
    const adapter = makeWallet();
    const pk = await getWalletPublicKey(adapter);
    expect(pk).toBe(VALID_PUBLIC_KEY);
    expect(pk.startsWith('G')).toBe(true);
  });

  it('throws WalletNotConnectedError when wallet is disconnected', async () => {
    const adapter = makeWallet({ isConnected: jest.fn().mockResolvedValue(false) });
    await expect(getWalletPublicKey(adapter)).rejects.toThrow(WalletNotConnectedError);
  });

  it('throws WalletNotConnectedError when key does not start with G', async () => {
    const adapter = makeWallet({
      getPublicKey: jest.fn().mockResolvedValue('SNOTAVALIDPUBLICKEY'),
    });
    await expect(getWalletPublicKey(adapter)).rejects.toThrow(WalletNotConnectedError);
    await expect(getWalletPublicKey(adapter)).rejects.toThrow('invalid public key');
  });

  it('throws WalletNotConnectedError when key is empty string', async () => {
    const adapter = makeWallet({ getPublicKey: jest.fn().mockResolvedValue('') });
    await expect(getWalletPublicKey(adapter)).rejects.toThrow(WalletNotConnectedError);
  });
});

// ─── signTransaction ─────────────────────────────────────────────────────────

describe('signTransaction', () => {
  it('returns signed XDR for a valid testnet transaction', async () => {
    const adapter = makeWallet();
    const result = await signTransaction(SAMPLE_XDR, 'testnet', adapter);
    expect(result).toBe(SIGNED_XDR);
  });

  it('passes the correct network passphrase to Freighter for testnet', async () => {
    const adapter = makeWallet();
    await signTransaction(SAMPLE_XDR, 'testnet', adapter);

    const signCall = (adapter.signTransaction as jest.Mock).mock.calls[0];
    expect(signCall[1]).toMatchObject({
      network: 'testnet',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
  });

  it('passes the correct network passphrase to Freighter for mainnet', async () => {
    const adapter = makeWallet();
    await signTransaction(SAMPLE_XDR, 'mainnet', adapter);

    const signCall = (adapter.signTransaction as jest.Mock).mock.calls[0];
    expect(signCall[1]).toMatchObject({
      network: 'mainnet',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });
  });

  it('throws WalletRejectionError when Freighter throws with "rejected" in message', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('User rejected the request')),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletRejectionError when Freighter throws with "cancel" in message', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('User cancelled signing')),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletRejectionError when Freighter throws with "denied" in message', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('Transaction denied by user')),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('rethrows unrelated errors as-is (non-rejection errors)', async () => {
    const networkError = new Error('Network timeout');
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(networkError),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow('Network timeout');
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.not.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletRejectionError when Freighter returns the original XDR unchanged', async () => {
    // Freighter sometimes returns the original XDR when signing is not applied.
    const adapter = makeWallet({
      signTransaction: jest.fn().mockResolvedValue(SAMPLE_XDR),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletNotConnectedError when wallet is disconnected', async () => {
    const adapter = makeWallet({ isConnected: jest.fn().mockResolvedValue(false) });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletNotConnectedError,
    );
  });
});

// ─── signTransaction: multi-signature edge cases (Issue #1182) ────────────────

describe('signTransaction — multi-signature edge cases', () => {
  it('returns a distinct signed XDR when multiple signers are involved', async () => {
    const multiSigXdr = 'AAAAAgAAAABmulti-sig-signed==';
    const adapter = makeWallet({
      signTransaction: jest.fn().mockResolvedValue(multiSigXdr),
    });
    const result = await signTransaction(SAMPLE_XDR, 'testnet', adapter);
    expect(result).toBe(multiSigXdr);
    expect(result).not.toBe(SAMPLE_XDR);
  });

  it('forwards the original XDR unchanged to the wallet for multi-sig collection', async () => {
    const adapter = makeWallet();
    await signTransaction(SAMPLE_XDR, 'testnet', adapter);
    const signCall = (adapter.signTransaction as jest.Mock).mock.calls[0];
    expect(signCall[0]).toBe(SAMPLE_XDR);
  });

  it('throws WalletRejectionError when a co-signer rejects the multi-sig request', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('Co-signer rejected the request')),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletRejectionError when a co-signer cancels the multi-sig request', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('Co-signer cancelled')),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletRejectionError when the wallet returns an empty multi-sig XDR', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockResolvedValue(''),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });
});

// ─── signTransaction: expired timebounds (Issue #1182) ────────────────────────

describe('signTransaction — expired timebounds', () => {
  it('throws WalletRejectionError when the wallet reports expired timebounds', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('Transaction timebounds expired')),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletRejectionError when the wallet reports a tx_too_late error', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('tx_too_late')),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('rethrows a non-rejection expired-timebounds error unchanged', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('timebound validation failed')),
    });
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.toThrow(
      'timebound validation failed',
    );
    await expect(signTransaction(SAMPLE_XDR, 'testnet', adapter)).rejects.not.toThrow(
      WalletRejectionError,
    );
  });
});

// ─── signTransaction: malformed XDR input (Issue #1182) ───────────────────────

describe('signTransaction — malformed XDR input', () => {
  it('throws WalletRejectionError when the wallet rejects malformed XDR', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('Malformed XDR envelope')),
    });
    await expect(signTransaction('not-valid-xdr', 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletRejectionError when the wallet rejects an empty XDR string', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('Invalid XDR: empty input')),
    });
    await expect(signTransaction('', 'testnet', adapter)).rejects.toThrow(WalletRejectionError);
  });

  it('rethrows a non-rejection malformed-XDR error unchanged', async () => {
    const adapter = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('XDR decode failure')),
    });
    await expect(signTransaction('@@@', 'testnet', adapter)).rejects.toThrow('XDR decode failure');
    await expect(signTransaction('@@@', 'testnet', adapter)).rejects.not.toThrow(
      WalletRejectionError,
    );
  });

  it('throws WalletRejectionError when the wallet echoes malformed XDR unchanged', async () => {
    const malformed = 'not-valid-xdr';
    const adapter = makeWallet({
      signTransaction: jest.fn().mockResolvedValue(malformed),
    });
    await expect(signTransaction(malformed, 'testnet', adapter)).rejects.toThrow(
      WalletRejectionError,
    );
  });
});

// ─── submitTransaction ────────────────────────────────────────────────────────

describe('submitTransaction', () => {
  it('returns the result on SUCCESS status', async () => {
    const submitAdapter = makeSubmit();
    const result = await submitTransaction(SIGNED_XDR, submitAdapter);
    expect(result.hash).toBe('abc123');
    expect(result.status).toBe('SUCCESS');
    expect(result.ledger).toBe(1234);
  });

  it('passes the signed XDR to the adapter unchanged', async () => {
    const submitAdapter = makeSubmit();
    await submitTransaction(SIGNED_XDR, submitAdapter);
    expect(submitAdapter.submitTransaction).toHaveBeenCalledWith(SIGNED_XDR);
  });

  it('throws TransactionSubmitError when status is not SUCCESS', async () => {
    const submitAdapter = makeSubmit({
      submitTransaction: jest.fn().mockResolvedValue({ hash: 'x', status: 'ERROR' }),
    });
    await expect(submitTransaction(SIGNED_XDR, submitAdapter)).rejects.toThrow(
      TransactionSubmitError,
    );
  });

  it('throws TransactionSubmitError when the signed XDR is empty', async () => {
    const submitAdapter = makeSubmit();
    await expect(submitTransaction('', submitAdapter)).rejects.toThrow(TransactionSubmitError);
  });
});

// ─── signAndSubmitTransaction ─────────────────────────────────────────────────

describe('signAndSubmitTransaction', () => {
  it('signs and submits a transaction end-to-end', async () => {
    const wallet = makeWallet();
    const submitAdapter = makeSubmit();
    const result = await signAndSubmitTransaction(SAMPLE_XDR, 'testnet', wallet, submitAdapter);
    expect(result.status).toBe('SUCCESS');
    expect(wallet.signTransaction).toHaveBeenCalled();
    expect(submitAdapter.submitTransaction).toHaveBeenCalledWith(SIGNED_XDR);
  });

  it('propagates WalletNotConnectedError from the signing step', async () => {
    const wallet = makeWallet({ isConnected: jest.fn().mockResolvedValue(false) });
    const submitAdapter = makeSubmit();
    await expect(
      signAndSubmitTransaction(SAMPLE_XDR, 'testnet', wallet, submitAdapter),
    ).rejects.toThrow(WalletNotConnectedError);
    expect(submitAdapter.submitTransaction).not.toHaveBeenCalled();
  });

  it('propagates WalletRejectionError from the signing step', async () => {
    const wallet = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('User rejected the request')),
    });
    const submitAdapter = makeSubmit();
    await expect(
      signAndSubmitTransaction(SAMPLE_XDR, 'testnet', wallet, submitAdapter),
    ).rejects.toThrow(WalletRejectionError);
    expect(submitAdapter.submitTransaction).not.toHaveBeenCalled();
  });

  it('propagates TransactionSubmitError from the submit step', async () => {
    const wallet = makeWallet();
    const submitAdapter = makeSubmit({
      submitTransaction: jest.fn().mockResolvedValue({ hash: 'x', status: 'ERROR' }),
    });
    await expect(
      signAndSubmitTransaction(SAMPLE_XDR, 'testnet', wallet, submitAdapter),
    ).rejects.toThrow(TransactionSubmitError);
  });
});

// ─── mapTransactionError ──────────────────────────────────────────────────────

describe('mapTransactionError', () => {
  it('maps tx_bad_seq to a descriptive message', () => {
    expect(mapTransactionError('tx_bad_seq')).toMatch(/sequence/i);
  });

  it('maps tx_insufficient_fee to a descriptive message', () => {
    expect(mapTransactionError('tx_insufficient_fee')).toMatch(/fee/i);
  });

  it('maps tx_too_late to a descriptive message', () => {
    expect(mapTransactionError('tx_too_late')).toMatch(/timebound|late|expired/i);
  });

  it('maps tx_bad_auth to a descriptive message', () => {
    expect(mapTransactionError('tx_bad_auth')).toMatch(/signature|auth/i);
  });

  it('returns a generic message for unknown codes', () => {
    expect(mapTransactionError('some_unknown_code')).toBeTruthy();
  });
});

// ─── Error class name properties ──────────────────────────────────────────────

describe('error class name properties', () => {
  it('WalletNotConnectedError has the correct name', () => {
    expect(new WalletNotConnectedError().name).toBe('WalletNotConnectedError');
  });

  it('WalletRejectionError has the correct name', () => {
    expect(new WalletRejectionError().name).toBe('WalletRejectionError');
  });

  it('TransactionSubmitError has the correct name', () => {
    expect(new TransactionSubmitError('boom').name).toBe('TransactionSubmitError');
  });
});
