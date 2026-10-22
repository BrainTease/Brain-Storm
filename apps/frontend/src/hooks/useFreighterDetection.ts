'use client';

import { useMemo } from 'react';

/** Result of probing for the Freighter browser extension. */
export type FreighterDetection = { status: 'available' } | { status: 'missing' };

export interface FreighterDetectionApi {
  /** Resolves to `available` when Freighter is installed and has granted this site access. */
  detectFreighter: () => Promise<FreighterDetection>;
  /** Returns the active account's public key. Rejects if Freighter reports an error. */
  getPublicKey: () => Promise<string>;
  /** Signs a message with the given account and returns the signed payload. */
  signMessage: (message: string, address: string) => Promise<string>;
}

/**
 * Single place that talks to `@stellar/freighter-api`.
 *
 * The SDK is imported lazily so the wallet code stays out of the initial bundle.
 * Components consume the typed results and never touch the extension directly.
 */
export function useFreighterDetection(): FreighterDetectionApi {
  return useMemo<FreighterDetectionApi>(
    () => ({
      async detectFreighter() {
        const freighter = await import('@stellar/freighter-api');
        try {
          const { isConnected } = await freighter.isConnected();
          return isConnected ? { status: 'available' } : { status: 'missing' };
        } catch {
          return { status: 'missing' };
        }
      },

      async getPublicKey() {
        const freighter = await import('@stellar/freighter-api');
        const { publicKey, error } = await freighter.getPublicKey();
        if (error) throw new Error(error);
        return publicKey;
      },

      async signMessage(message, address) {
        const freighter = await import('@stellar/freighter-api');
        const { signedMessage } = await freighter.signMessage(message, { address });
        return signedMessage;
      },
    }),
    []
  );
}

export default useFreighterDetection;
