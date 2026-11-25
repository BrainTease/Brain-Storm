/**
 * Narrowing helpers for Stellar network values (#1551).
 *
 * Kept separate from `configuration.ts` so they can be tested without pulling
 * in the SDK or the Nest module graph. The Joi schema is the authority for the
 * accepted values; this function only removes unsafe `as` casts from app code.
 */

/** The only two networks the backend Joi schema accepts. */
export type StellarNetworkName = 'testnet' | 'mainnet';

/** Narrows a raw network value to a schema-valid network, defaulting to testnet. */
export function parseStellarNetwork(raw: string | undefined): StellarNetworkName {
  return raw === 'mainnet' ? 'mainnet' : 'testnet';
}
