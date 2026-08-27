import { WalletError, type WalletAdapter, type WalletType } from '../types';
import { freighterAdapter } from './freighter';
import { albedoAdapter } from './albedo';
import { xbullAdapter } from './xbull';
import { walletConnectAdapter } from './walletconnect';

/** Registry keyed by wallet id — the only place a wallet is wired in. */
export const WALLET_ADAPTERS: Record<WalletType, WalletAdapter> = {
  freighter: freighterAdapter,
  albedo: albedoAdapter,
  xbull: xbullAdapter,
  walletconnect: walletConnectAdapter,
};

/** Display order for the wallet picker. */
export const SUPPORTED_WALLETS: WalletAdapter[] = [
  freighterAdapter,
  albedoAdapter,
  xbullAdapter,
  walletConnectAdapter,
];

export function getWalletAdapter(type: WalletType): WalletAdapter {
  const adapter = WALLET_ADAPTERS[type];
  if (!adapter) {
    throw new WalletError('UNSUPPORTED_WALLET', `Wallet "${type}" is not supported.`);
  }
  return adapter;
}

export { freighterAdapter, albedoAdapter, xbullAdapter, walletConnectAdapter };
