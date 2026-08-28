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
    await expect(submitTransaction(SIGNED_XDR, submitAdapter)).rejects.toThrow(
      'Transaction failed with status: ERROR',
    );
  });

  it('throws TransactionSubmitError when status is PENDING', async () => {
    const submitAdapter = makeSubmit({
      submitTransaction: jest.fn().mockResolvedValue({ hash: 'x', status: 'PENDING' }),
    });
    await expect(submitTransaction(SIGNED_XDR, submitAdapter)).rejects.toThrow(
      TransactionSubmitError,
    );
  });

  it('throws TransactionSubmitError immediately for empty signedXdr', async () => {
    const submitAdapter = makeSubmit();
    await expect(submitTransaction('', submitAdapter)).rejects.toThrow(TransactionSubmitError);
    await expect(submitTransaction('', submitAdapter)).rejects.toThrow('must not be empty');
    // The adapter should NOT have been called
    expect(submitAdapter.submitTransaction).not.toHaveBeenCalled();
  });

  it('surfaces errors thrown by the submit adapter', async () => {
    const submitAdapter = makeSubmit({
      submitTransaction: jest.fn().mockRejectedValue(new Error('Horizon 503')),
    });
    await expect(submitTransaction(SIGNED_XDR, submitAdapter)).rejects.toThrow('Horizon 503');
  });
});

// ─── signAndSubmitTransaction ─────────────────────────────────────────────────

describe('signAndSubmitTransaction', () => {
  it('signs and submits on the happy path, returning the confirmed result', async () => {
    const wallet = makeWallet();
    const submit = makeSubmit();

    const result = await signAndSubmitTransaction(SAMPLE_XDR, 'testnet', wallet, submit);

    expect(wallet.signTransaction).toHaveBeenCalledWith(
      SAMPLE_XDR,
      expect.objectContaining({ networkPassphrase: 'Test SDF Network ; September 2015' }),
    );
    expect(submit.submitTransaction).toHaveBeenCalledWith(SIGNED_XDR);
    expect(result.status).toBe('SUCCESS');
  });

  it('does not call submit when signing fails with WalletRejectionError', async () => {
    const wallet = makeWallet({
      signTransaction: jest.fn().mockRejectedValue(new Error('User rejected the request')),
    });
    const submit = makeSubmit();

    await expect(signAndSubmitTransaction(SAMPLE_XDR, 'testnet', wallet, submit)).rejects.toThrow(
      WalletRejectionError,
    );
    expect(submit.submitTransaction).not.toHaveBeenCalled();
  });

  it('propagates TransactionSubmitError from the submit adapter', async () => {
    const wallet = makeWallet();
    const submit = makeSubmit({
      submitTransaction: jest.fn().mockResolvedValue({ hash: 'x', status: 'FAILED' }),
    });

    await expect(signAndSubmitTransaction(SAMPLE_XDR, 'testnet', wallet, submit)).rejects.toThrow(
      TransactionSubmitError,
    );
  });

  it('works for mainnet with the correct passphrase', async () => {
    const wallet = makeWallet();
    const submit = makeSubmit();

    await signAndSubmitTransaction(SAMPLE_XDR, 'mainnet', wallet, submit);

    const signOpts = (wallet.signTransaction as jest.Mock).mock.calls[0][1];
    expect(signOpts.networkPassphrase).toBe('Public Global Stellar Network ; September 2015');
  });
});

// ─── mapTransactionError ─────────────────────────────────────────────────────

describe('mapTransactionError', () => {
  it('returns a human-readable message for tx_too_late', () => {
    const raw = { extras: { result_codes: { transaction: 'tx_too_late' } } };
    expect(mapTransactionError(raw)).toContain('expired');
  });

  it('returns a human-readable message for tx_bad_auth', () => {
    const raw = { extras: { result_codes: { transaction: 'tx_bad_auth' } } };
    expect(mapTransactionError(raw)).toContain('signature');
  });

  it('returns a human-readable message for tx_bad_seq', () => {
    const raw = { extras: { result_codes: { transaction: 'tx_bad_seq' } } };
    expect(mapTransactionError(raw)).toContain('Sequence');
  });

  it('returns a human-readable message for tx_insufficient_fee', () => {
    const raw = { extras: { result_codes: { transaction: 'tx_insufficient_fee' } } };
    expect(mapTransactionError(raw)).toContain('Fee');
  });

  it('returns a human-readable message for tx_no_account', () => {
    const raw = { extras: { result_codes: { transaction: 'tx_no_account' } } };
    expect(mapTransactionError(raw)).toContain('account does not exist');
  });

  it('returns a human-readable message for op_underfunded', () => {
    const raw = { extras: { result_codes: { transaction: 'op_underfunded' } } };
    expect(mapTransactionError(raw)).toContain('balance');
  });

  it('returns a human-readable message for op_bad_auth', () => {
    const raw = { extras: { result_codes: { transaction: 'op_bad_auth' } } };
    expect(mapTransactionError(raw)).toContain('authorization');
  });

  it('passes through an unknown Horizon result code unchanged', () => {
    const raw = { extras: { result_codes: { transaction: 'tx_unknown_code_xyz' } } };
    expect(mapTransactionError(raw)).toBe('tx_unknown_code_xyz');
  });

  it('extracts message from a Soroban RPC error envelope', () => {
    const raw = { error: { message: 'Contract wasm not found' } };
    expect(mapTransactionError(raw)).toBe('Contract wasm not found');
  });

  it('extracts top-level message field', () => {
    expect(mapTransactionError({ message: 'Something went wrong' })).toBe('Something went wrong');
  });

  it('returns a generic message for null', () => {
    expect(mapTransactionError(null)).toBe('Unknown transaction error');
  });

  it('returns a generic message for a non-object', () => {
    expect(mapTransactionError('raw string')).toBe('Unknown transaction error');
  });

  it('returns a generic message for an empty object', () => {
    expect(mapTransactionError({})).toBe('Unknown transaction error');
  });
});

// ─── Error class names ────────────────────────────────────────────────────────

describe('Error class names', () => {
  it('TransactionSubmitError has correct name property', () => {
    const err = new TransactionSubmitError('test');
    expect(err.name).toBe('TransactionSubmitError');
    expect(err.message).toBe('test');
  });

  it('TransactionSubmitError carries raw payload', () => {
    const raw = { status: 'ERROR', code: 42 };
    const err = new TransactionSubmitError('test', raw);
    expect(err.raw).toEqual(raw);
  });

  it('WalletRejectionError has correct name property', () => {
    const err = new WalletRejectionError();
    expect(err.name).toBe('WalletRejectionError');
    expect(err.message).toBe('User rejected the transaction');
  });

  it('WalletNotConnectedError has correct name property', () => {
    const err = new WalletNotConnectedError();
    expect(err.name).toBe('WalletNotConnectedError');
    expect(err.message).toBe('Wallet not connected');
  });

  it('WalletRejectionError accepts a custom message', () => {
    const err = new WalletRejectionError('Custom rejection');
    expect(err.message).toBe('Custom rejection');
  });

  it('WalletNotConnectedError accepts a custom message', () => {
    const err = new WalletNotConnectedError('Custom not connected');
    expect(err.message).toBe('Custom not connected');
  });
});
