/**
 * Single source of truth for Stellar network configuration.
 *
 * Horizon URLs, network passphrases and explorer links were previously derived
 * independently in `walletApi`, `walletAdapters` and `TransactionModal`, which
 * meant three places to update when a network was added.
 */

export const STELLAR_NETWORK = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet').toLowerCase();

export const IS_MAINNET = STELLAR_NETWORK === 'mainnet';

export const NETWORK_PASSPHRASE = IS_MAINNET
  ? 'Public Global Stellar Network ; September 2015'
  : 'Test SDF Network ; September 2015';

export const HORIZON_URL = IS_MAINNET
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

const EXPLORER_TX_BASE = IS_MAINNET
  ? 'https://stellar.expert/explorer/public/tx'
  : 'https://stellar.expert/explorer/testnet/tx';

/** Network identifier expected by `@stellar/freighter-api`. */
export const FREIGHTER_NETWORK = IS_MAINNET ? 'MAINNET' : 'TESTNET';

export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER_TX_BASE}/${txHash}`;
}

/**
 * Wallets report the network inconsistently — Freighter returns a name
 * ("TESTNET"), Albedo and xBull return the full passphrase. Normalize both
 * forms before comparing, otherwise passphrase-reporting wallets are always
 * flagged as mismatched.
 */
function normalizeNetwork(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('test sdf network') || lower.includes('testnet')) return 'testnet';
  if (lower.includes('public global stellar network') || lower.includes('public')) return 'mainnet';
  if (lower.includes('mainnet')) return 'mainnet';
  return lower;
}

export function isExpectedNetwork(
  reported: string | null | undefined,
  expected: string = STELLAR_NETWORK
): boolean {
  if (!reported) return true;
  return normalizeNetwork(reported) === normalizeNetwork(expected);
}
