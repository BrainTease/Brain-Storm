/**
 * Typed environment access for shared app logic.
 *
 * These values are public (bundled into the browser), so Next.js inlines the
 * static `process.env.KEY` expressions below at build time. Both keys are
 * listed in `apps/frontend/src/config/public-env.json` so the host app inlines
 * them for this package too.
 */
export type StellarNetworkName = 'testnet' | 'mainnet';

const VALID_NETWORKS: readonly StellarNetworkName[] = ['testnet', 'mainnet'];

function read(key: 'NEXT_PUBLIC_STELLAR_NETWORK' | 'NEXT_PUBLIC_BST_CONTRACT_ID'): string {
  if (typeof process === 'undefined' || !process.env) {
    return '';
  }
  switch (key) {
    case 'NEXT_PUBLIC_STELLAR_NETWORK':
      return process.env.NEXT_PUBLIC_STELLAR_NETWORK?.trim() ?? '';
    case 'NEXT_PUBLIC_BST_CONTRACT_ID':
      return process.env.NEXT_PUBLIC_BST_CONTRACT_ID?.trim() ?? '';
  }
}

/** Validated Stellar network, falling back to testnet for unknown values. */
export function getStellarNetworkName(): StellarNetworkName {
  const raw = read('NEXT_PUBLIC_STELLAR_NETWORK').toLowerCase();
  if (VALID_NETWORKS.includes(raw as StellarNetworkName)) {
    return raw as StellarNetworkName;
  }
  return 'testnet';
}

/** Reward-token contract ID, or an empty string when not configured. */
export function getBstContractId(): string {
  return read('NEXT_PUBLIC_BST_CONTRACT_ID');
}
