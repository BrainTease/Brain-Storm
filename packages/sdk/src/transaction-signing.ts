/**
 * transaction-signing.ts — Issue #1018
 *
 * Client-side Stellar / Soroban transaction-signing helpers for Brain-Storm.
 *
 * These utilities bridge the gap between the `@brain-storm/sdk` REST client
 * and the Freighter browser-wallet extension.  They intentionally make NO live
 * network calls; all Horizon / Soroban RPC interaction is delegated to the
 * injected adapter so that unit tests can swap in a mock.
 *
 * @module transaction-signing
 */

import { getStellarNetworkConfig, StellarNetwork } from './index';

// ─── Public interfaces ────────────────────────────────────────────────────────

/** The minimal surface of the Freighter extension that these helpers depend on. */
export interface FreighterAdapter {
  /** Returns the connected wallet's G… public key. */
  getPublicKey(): Promise<string>;
  /**
   * Presents the XDR to the user for approval and returns the signed XDR
   * when approved.
   */
  signTransaction(xdr: string, opts?: { network?: string; networkPassphrase?: string }): Promise<string>;
  /** Returns true when Freighter is installed and the user has connected. */
  isConnected(): Promise<boolean>;
}

/** Minimal Soroban / Horizon submit adapter used by {@link submitTransaction}. */
export interface StellarSubmitAdapter {
  /**
   * Submits a signed XDR to the network and resolves with the server response.
   * Rejects with a {@link TransactionSubmitError} on failure.
   */
  submitTransaction(signedXdr: string): Promise<TransactionResult>;
}

/** Outcome of a successful transaction submission. */
export interface TransactionResult {
  /** Stellar transaction hash. */
  hash: string;
  /** `'SUCCESS'` on confirmed ledger inclusion, or another status string. */
  status: string;
  /** Ledger sequence number the transaction was included in. */
  ledger?: number;
}

/** Thrown (and exported) when a transaction cannot be submitted. */
export class TransactionSubmitError extends Error {
  constructor(
    message: string,
    /** Raw error body returned by Horizon / Soroban RPC, if available. */
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'TransactionSubmitError';
  }
}

/** Thrown when the user rejects the transaction in their wallet. */
export class WalletRejectionError extends Error {
  constructor(message = 'User rejected the transaction') {
    super(message);
    this.name = 'WalletRejectionError';
  }
}

/** Thrown when Freighter is not installed or not connected. */
export class WalletNotConnectedError extends Error {
  constructor(message = 'Wallet not connected') {
    super(message);
    this.name = 'WalletNotConnectedError';
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Ensures Freighter is installed and connected.
 *
 * @throws {@link WalletNotConnectedError} when the adapter reports disconnected.
 */
export async function requireWalletConnected(adapter: FreighterAdapter): Promise<void> {
  const connected = await adapter.isConnected();
  if (!connected) {
    throw new WalletNotConnectedError();
  }
}

/**
 * Fetches the current wallet's public key.
 *
 * @throws {@link WalletNotConnectedError} if the wallet is not ready.
 */
export async function getWalletPublicKey(adapter: FreighterAdapter): Promise<string> {
  await requireWalletConnected(adapter);
  const key = await adapter.getPublicKey();
  if (!key || !key.startsWith('G')) {
    throw new WalletNotConnectedError('Wallet returned an invalid public key');
  }
  return key;
}

/**
 * Asks the user to sign a transaction XDR via their Freighter wallet.
 *
 * @param xdr - Base64-encoded unsigned Stellar transaction XDR.
 * @param network - Target network (`'testnet'` or `'mainnet'`).
 * @param adapter - Freighter adapter. Defaults to `window.freighter` when not supplied.
 *
 * @throws {@link WalletNotConnectedError} when Freighter is absent.
 * @throws {@link WalletRejectionError} when the user cancels the signing prompt.
 *
 * @returns The signed transaction XDR as returned by Freighter.
 */
export async function signTransaction(
  xdr: string,
  network: StellarNetwork,
  adapter: FreighterAdapter,
): Promise<string> {
  await requireWalletConnected(adapter);

  const config = getStellarNetworkConfig(network);

  let signedXdr: string;
  try {
    signedXdr = await adapter.signTransaction(xdr, {
      network: config.network,
      networkPassphrase: config.passphrase,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // Freighter surfaces user-cancel as an error with the word "rejected"
    if (/reject|cancel|denied/i.test(message)) {
      throw new WalletRejectionError(message);
    }
    throw err;
  }

  if (!signedXdr || signedXdr === xdr) {
    // Some mock adapters or edge-case Freighter versions return the original XDR
    // unchanged. Treat an identical return as a rejection.
    throw new WalletRejectionError('Wallet did not modify the XDR — signing was not applied');
  }

  return signedXdr;
}

/**
 * Submits a signed XDR to the network via the provided adapter.
 *
 * @throws {@link TransactionSubmitError} on non-SUCCESS status.
 */
export async function submitTransaction(
  signedXdr: string,
  submitAdapter: StellarSubmitAdapter,
): Promise<TransactionResult> {
  if (!signedXdr) {
    throw new TransactionSubmitError('signedXdr must not be empty');
  }

  const result = await submitAdapter.submitTransaction(signedXdr);

  if (result.status !== 'SUCCESS') {
    throw new TransactionSubmitError(
      `Transaction failed with status: ${result.status}`,
      result,
    );
  }

  return result;
}

/**
 * Sign-and-submit convenience helper: signs the XDR with the wallet,
 * then immediately submits it to the network.
 *
 * @param xdr - Unsigned transaction XDR.
 * @param network - `'testnet'` or `'mainnet'`.
 * @param walletAdapter - Freighter adapter.
 * @param submitAdapter - Network submit adapter.
 *
 * @returns The confirmed {@link TransactionResult}.
 */
export async function signAndSubmitTransaction(
  xdr: string,
  network: StellarNetwork,
  walletAdapter: FreighterAdapter,
  submitAdapter: StellarSubmitAdapter,
): Promise<TransactionResult> {
  const signedXdr = await signTransaction(xdr, network, walletAdapter);
  return submitTransaction(signedXdr, submitAdapter);
}

/**
 * Maps well-known Horizon / Soroban RPC error codes to human-readable messages.
 *
 * Only a subset of error codes is mapped; unknown codes pass through unchanged.
 */
export function mapTransactionError(raw: unknown): string {
  if (!raw || typeof raw !== 'object') return 'Unknown transaction error';

  const obj = raw as Record<string, unknown>;

  // Horizon REST envelope: `{ extras: { result_codes: { transaction: '...' } } }`
  const resultCodes = obj?.['extras'] as Record<string, unknown> | undefined;
  const txCode = resultCodes?.['result_codes'] as Record<string, unknown> | undefined;
  if (txCode?.['transaction']) {
    return mapHorizonResultCode(String(txCode['transaction']));
  }

  // Soroban RPC: `{ error: { message: '...' } }`
  const rpcError = obj?.['error'] as Record<string, unknown> | undefined;
  if (rpcError?.['message']) {
    return String(rpcError['message']);
  }

  // Generic message field
  if (obj?.['message']) return String(obj['message']);

  return 'Unknown transaction error';
}

function mapHorizonResultCode(code: string): string {
  const MAP: Record<string, string> = {
    tx_too_late: 'Transaction expired — rebuild it with a later timeout.',
    tx_bad_auth: 'Invalid signature — make sure you are signing with the correct key.',
    tx_bad_seq: 'Sequence number mismatch — reload the account and retry.',
    tx_insufficient_fee: 'Fee too low — increase the base fee and retry.',
    tx_no_account: 'Source account does not exist — fund it first.',
    op_underfunded: 'Insufficient balance for this operation.',
    op_bad_auth: 'Operation authorization failed.',
  };
  return MAP[code] ?? code;
}
