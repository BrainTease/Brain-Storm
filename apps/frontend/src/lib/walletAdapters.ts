// Lightweight wallet adapter layer providing a normalized connect/sign interface
// for wallets beyond Freighter (Albedo, xBull, WalletConnect).

export interface WalletAdapter {
  id: string;
  name: string;
  icon: string;
  installUrl: string;
  helpUrl: string;
  isInstalled: () => boolean;
  connect: () => Promise<{ publicKey: string; network: string }>;
  sign: (xdr: string, network: string) => Promise<string>;
}

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

const NETWORK = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
const NETWORK_PASSPHRASE =
  NETWORK === 'mainnet'
    ? 'Public Global Stellar Network ; September 2015'
    : 'Test SDF Network ; September 2015';

export async function connectAlbedo(): Promise<{ publicKey: string; network: string }> {
  if (typeof window === 'undefined' || !window.albedo) {
    throw new Error('Albedo extension not found.');
  }
  const { pubkey } = await window.albedo.publicKey({});
  return { publicKey: pubkey, network: NETWORK_PASSPHRASE };
}

export async function signWithAlbedo(xdr: string): Promise<string> {
  if (typeof window === 'undefined' || !window.albedo) {
    throw new Error('Albedo extension not found.');
  }
  const { signed_envelope_xdr } = await window.albedo.tx({ xdr, network: NETWORK_PASSPHRASE });
  return signed_envelope_xdr;
}

export async function connectXbull(): Promise<{ publicKey: string; network: string }> {
  if (typeof window === 'undefined' || !window.xBull) {
    throw new Error('xBull extension not found.');
  }
  const { publicKey } = await window.xBull.connect();
  return { publicKey, network: NETWORK_PASSPHRASE };
}

export async function signWithXbull(xdr: string): Promise<string> {
  if (typeof window === 'undefined' || !window.xBull) {
    throw new Error('xBull extension not found.');
  }
  const { signedXDR } = await window.xBull.sign({ xdr, network: NETWORK_PASSPHRASE });
  return signedXDR;
}

export const SUPPORTED_WALLETS: Array<{
  id: 'freighter' | 'albedo' | 'xbull' | 'walletconnect';
  name: string;
  description: string;
  installUrl: string;
  helpUrl: string;
  isInstalled: () => boolean;
}> = [
  {
    id: 'freighter',
    name: 'Freighter',
    description: 'Official Stellar browser extension',
    installUrl: 'https://www.freighter.app/',
    helpUrl: 'https://docs.freighter.app/',
    isInstalled: () => typeof window !== 'undefined' && !!window.freighter,
  },
  {
    id: 'albedo',
    name: 'Albedo',
    description: 'Web-based Stellar signer',
    installUrl: 'https://albedo.link/',
    helpUrl: 'https://albedo.link/docs',
    isInstalled: () => typeof window !== 'undefined' && !!window.albedo,
  },
  {
    id: 'xbull',
    name: 'xBull',
    description: 'Advanced Stellar wallet extension',
    installUrl: 'https://xbull.app/',
    helpUrl: 'https://xbull.app/docs',
    isInstalled: () => typeof window !== 'undefined' && !!window.xBull,
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    description: 'Connect mobile wallets via QR code',
    installUrl: 'https://walletconnect.com/',
    helpUrl: 'https://docs.walletconnect.com/',
    isInstalled: () => false,
  },
];
