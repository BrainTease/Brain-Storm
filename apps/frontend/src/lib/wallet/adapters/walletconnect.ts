import { WalletError, type WalletAdapter, type WalletConnection } from '../types';

/**
 * Placeholder entry so WalletConnect is discoverable in the picker while the
 * QR-relay integration is still pending. `enabled: false` keeps the UI from
 * offering it as a working option.
 */
export const walletConnectAdapter: WalletAdapter = {
  id: 'walletconnect',
  name: 'WalletConnect',
  description: 'Connect mobile wallets via QR code',
  installUrl: 'https://walletconnect.com/',
  helpUrl: 'https://docs.walletconnect.com/',
  enabled: false,

  isInstalled: () => false,

  async connect(): Promise<WalletConnection> {
    throw new WalletError(
      'UNSUPPORTED_WALLET',
      'WalletConnect is not available yet.',
      'walletconnect'
    );
  },

  async sign(): Promise<string> {
    throw new WalletError(
      'UNSUPPORTED_WALLET',
      'WalletConnect is not available yet.',
      'walletconnect'
    );
  },
};
