/**
 * Single source of truth for Stellar network configuration in the frontend.
 *
 * Horizon URLs, network passphrases and explorer links were previously derived
 * independently in `walletApi`, `walletAdapters` and `TransactionModal`, which
 * meant three places to update when a network was added. The passphrase and
 * Horizon URL themselves now come from `@brain-storm/sdk`'s
 * `STELLAR_NETWORK_CONFIGS`, so this module and the SDK can't drift apart.
 */
import { getStellarNetworkConfig, type StellarNetwork } from '@brain-storm/sdk';

import { getConfig } from '@/config';

// The central config validates and normalizes the network value. The SDK only
// knows testnet/mainnet, so map any other configured network to its fallback.
const configuredNetwork = getConfig().stellarNetwork;

export const STELLAR_NETWORK: StellarNetwork =
  configuredNetwork === 'mainnet' ? 'mainnet' : 'testnet';

export const IS_MAINNET = STELLAR_NETWORK === 'mainnet';

const NETWORK_CONFIG = getStellarNetworkConfig(STELLAR_NETWORK);

export const NETWORK_PASSPHRASE = NETWORK_CONFIG.passphrase;

export const HORIZON_URL = NETWORK_CONFIG.horizonUrl;

/** Soroban RPC base URL for the active network. */
export const SOROBAN_RPC_URL = NETWORK_CONFIG.sorobanRpcUrl;

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
