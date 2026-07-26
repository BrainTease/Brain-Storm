import { NETWORK_PASSPHRASE } from '../network';
import { WalletError, type WalletAdapter, type WalletConnection } from '../types';

export const xbullAdapter: WalletAdapter = {
  id: 'xbull',
  name: 'xBull',
  description: 'Advanced Stellar wallet extension',
  installUrl: 'https://xbull.app/',
  helpUrl: 'https://xbull.app/docs',
  enabled: true,

  isInstalled: () => typeof window !== 'undefined' && !!window.xBull,

  async connect(): Promise<WalletConnection> {
    if (!xbullAdapter.isInstalled()) {
      throw new WalletError('NOT_INSTALLED', 'xBull extension not found.', 'xbull');
    }
    const { publicKey } = await window.xBull!.connect();
    return { publicKey, network: NETWORK_PASSPHRASE };
  },

  async sign(xdr: string): Promise<string> {
    if (!xbullAdapter.isInstalled()) {
      throw new WalletError('NOT_INSTALLED', 'xBull extension not found.', 'xbull');
    }
    const { signedXDR } = await window.xBull!.sign({ xdr, network: NETWORK_PASSPHRASE });
    return signedXDR;
  },
};
