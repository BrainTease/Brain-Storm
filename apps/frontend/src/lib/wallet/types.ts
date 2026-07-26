/**
 * Shared contracts for the wallet module.
 *
 * Everything the rest of the app needs to talk about wallets lives here so that
 * adapters, the store and the provider can depend on a single vocabulary
 * instead of on each other.
 */

export type WalletType = 'freighter' | 'albedo' | 'xbull' | 'walletconnect';

/** Result of a successful `connect()` on an adapter. */
export interface WalletConnection {
  publicKey: string;
  /** Network name or passphrase as reported by the wallet. */
  network: string;
}

/** Balances for the assets the app surfaces. */
export interface WalletBalances {
  xlm: string;
  bst: string;
}

export type WalletErrorCode =
  | 'NOT_INSTALLED'
  | 'CONNECTION_REJECTED'
  | 'UNSUPPORTED_WALLET'
  | 'NO_WALLET_CONNECTED'
  | 'SIGN_FAILED'
  | 'BALANCE_FETCH_FAILED'
  | 'UNKNOWN';

/**
 * Error type every adapter throws. Carrying a stable `code` lets the UI branch
 * on the failure (e.g. offer an install link) without matching on messages.
 */
export class WalletError extends Error {
  readonly code: WalletErrorCode;
  readonly walletId?: WalletType;

  constructor(code: WalletErrorCode, message: string, walletId?: WalletType) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
    this.walletId = walletId;
  }
}

/** Serializable projection of a `WalletError`, safe to keep in the store. */
export interface WalletErrorState {
  code: WalletErrorCode;
  message: string;
  walletId?: WalletType;
}

export function toWalletErrorState(error: unknown, walletId?: WalletType): WalletErrorState {
  if (error instanceof WalletError) {
    return { code: error.code, message: error.message, walletId: error.walletId ?? walletId };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { code: 'UNKNOWN', message, walletId };
}

/**
 * Normalized interface every supported wallet implements. Adding a wallet means
 * adding one file under `adapters/` and registering it — no `if/else` chains in
 * the provider or in components.
 */
export interface WalletAdapter {
  id: WalletType;
  name: string;
  description: string;
  installUrl: string;
  helpUrl: string;
  /** `false` while a wallet is stubbed out (e.g. WalletConnect). */
  enabled: boolean;
  isInstalled: () => boolean;
  connect: () => Promise<WalletConnection>;
  sign: (xdr: string) => Promise<string>;
}
