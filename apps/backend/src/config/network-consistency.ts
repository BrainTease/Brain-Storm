/**
 * Startup network-consistency check (#1218).
 *
 * Fails fast when:
 *   - the configured network name is not one the SDK knows about
 *   - the Horizon URL or Soroban RPC URL diverge from the shared
 *     StellarNetworkConfig for that network
 *   - an explicit passphrase is set that does not match the shared one
 *
 * Called from the app bootstrap so a mismatched deployment refuses to start.
 */
import { getStellarNetworkConfig, type StellarNetwork } from '@brain-storm/sdk';

export interface NetworkInputs {
  network?: string | null;
  horizonUrl?: string | null;
  sorobanRpcUrl?: string | null;
  passphrase?: string | null;
}

export function assertNetworkConsistency(inputs: NetworkInputs): void {
  const network = (inputs.network ?? 'testnet') as StellarNetwork;
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new Error(
      `[network] Unknown STELLAR_NETWORK="${network}". Expected "testnet" or "mainnet".`,
    );
  }

  const shared = getStellarNetworkConfig(network);

  if (inputs.passphrase && inputs.passphrase !== shared.passphrase) {
    throw new Error(
      `[network] Passphrase mismatch for ${network}. ` +
        `Configured="${inputs.passphrase}" expected="${shared.passphrase}".`,
    );
  }

  const hostOf = (u: string | null | undefined): string => {
    if (!u) return '';
    try { return new URL(u).host; } catch { return u; }
  };

  if (inputs.horizonUrl && hostOf(inputs.horizonUrl) !== hostOf(shared.horizonUrl)) {
    throw new Error(
      `[network] Horizon URL mismatch for ${network}. ` +
        `Configured=${hostOf(inputs.horizonUrl)} expected=${hostOf(shared.horizonUrl)}.`,
    );
  }

  if (inputs.sorobanRpcUrl && hostOf(inputs.sorobanRpcUrl) !== hostOf(shared.sorobanRpcUrl)) {
    throw new Error(
      `[network] Soroban RPC URL mismatch for ${network}. ` +
        `Configured=${hostOf(inputs.sorobanRpcUrl)} expected=${hostOf(shared.sorobanRpcUrl)}.`,
    );
  }
}
