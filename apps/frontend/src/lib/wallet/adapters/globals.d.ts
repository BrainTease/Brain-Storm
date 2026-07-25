/** Browser globals injected by the wallet extensions the app supports. */

declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
      getNetwork: () => Promise<string>;
    };
    albedo?: {
      publicKey: (opts: Record<string, unknown>) => Promise<{ pubkey: string }>;
      tx: (opts: { xdr: string; network: string }) => Promise<{ signed_envelope_xdr: string }>;
    };
    xBull?: {
      connect: () => Promise<{ publicKey: string }>;
      sign: (params: { xdr: string; network: string }) => Promise<{ signedXDR: string }>;
    };
  }
}

export {};
