/**
 * Shared Stellar / blockchain-related types.
 * @module stellar.types
 */

/**
 * Stellar wallet connection status.
 */
export type WalletConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

/**
 * A Stellar account balance entry.
 */
export interface StellarBalance {
  asset_type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
  balance: string;
  asset_code?: string;
  asset_issuer?: string;
}

/**
 * Payload for linking a Stellar wallet to a user account.
 */
export interface LinkWalletDto {
  publicKey: string;
  signature: string;
  /** Base64-encoded challenge returned by generateStellarChallenge */
  challenge: string;
}

/**
 * Challenge issued to a user for wallet ownership verification.
 */
export interface StellarChallenge {
  /** Base64-encoded challenge data */
  challenge: string;
  nonce: string;
  message: string;
}

/**
 * Credential issued on-chain (Soroban contract).
 */
export interface OnChainCredential {
  contractId: string;
  credentialId: string;
  recipientPublicKey: string;
  courseId: string;
  issuedAt: number;
  txHash: string;
}

// ─── Transaction Parsing & Validation ─────────────────────────────────────────

/**
 * Parsed Stellar transaction extracted from XDR.
 */
export interface ParsedTransaction {
  source: string;
  fee: string;
  sequence: string;
  memo: string | null;
  memoType: string | null;
  network: string;
  operations: ParsedOperation[];
  timeBounds: { minTime: string; maxTime: string } | null;
}

/**
 * Parsed operation within a transaction.
 */
export interface ParsedOperation {
  type: string;
  details: Record<string, string>;
}

/**
 * Result of transaction validation.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}
