import { NETWORK_PASSPHRASE } from '../network';
import { WalletError, type WalletAdapter, type WalletConnection } from '../types';

export const albedoAdapter: WalletAdapter = {
  id: 'albedo',
  name: 'Albedo',
  description: 'Web-based Stellar signer',
  installUrl: 'https://albedo.link/',
  helpUrl: 'https://albedo.link/docs',
  enabled: true,

  isInstalled: () => typeof window !== 'undefined' && !!window.albedo,

  async connect(): Promise<WalletConnection> {
    if (!albedoAdapter.isInstalled()) {
      throw new WalletError('NOT_INSTALLED', 'Albedo extension not found.', 'albedo');
    }
    const { pubkey } = await window.albedo!.publicKey({});
    return { publicKey: pubkey, network: NETWORK_PASSPHRASE };
  },

  async sign(xdr: string): Promise<string> {
    if (!albedoAdapter.isInstalled()) {
      throw new WalletError('NOT_INSTALLED', 'Albedo extension not found.', 'albedo');
    }
    const { signed_envelope_xdr } = await window.albedo!.tx({
      xdr,
      network: NETWORK_PASSPHRASE,
    });
    return signed_envelope_xdr;
  },
};
