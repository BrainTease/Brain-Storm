import { isConnected, getPublicKey, getNetwork, signTransaction } from '@stellar/freighter-api';
import { FREIGHTER_NETWORK } from '../network';
import { WalletError, type WalletAdapter, type WalletConnection } from '../types';

export const freighterAdapter: WalletAdapter = {
  id: 'freighter',
  name: 'Freighter',
  description: 'Official Stellar browser extension',
  installUrl: 'https://www.freighter.app/',
  helpUrl: 'https://docs.freighter.app/',
  enabled: true,

  isInstalled: () => typeof window !== 'undefined' && !!window.freighter,

  async connect(): Promise<WalletConnection> {
    if (!freighterAdapter.isInstalled()) {
      throw new WalletError('NOT_INSTALLED', 'Freighter is not installed.', 'freighter');
    }

    const { isConnected: connected } = await isConnected();
    if (!connected) {
      throw new WalletError('CONNECTION_REJECTED', 'Connection cancelled.', 'freighter');
    }

    const { publicKey, error: pkError } = await getPublicKey();
    if (pkError) throw new WalletError('CONNECTION_REJECTED', pkError, 'freighter');

    const { network, networkPassphrase, error: netError } = await getNetwork();
    if (netError) throw new WalletError('CONNECTION_REJECTED', netError, 'freighter');

    return { publicKey, network: network || networkPassphrase };
  },

  async sign(xdr: string): Promise<string> {
    const { signedTransaction, error } = await signTransaction(xdr, {
      network: FREIGHTER_NETWORK,
    });
    if (error) throw new WalletError('SIGN_FAILED', error, 'freighter');
    return signedTransaction;
  },
};
