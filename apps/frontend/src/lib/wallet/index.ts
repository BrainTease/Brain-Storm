/**
 * Public surface of the wallet module.
 *
 * Layers, from the bottom up:
 *   types        — shared vocabulary (`WalletAdapter`, `WalletError`, …)
 *   network      — Stellar network configuration
 *   adapters/*   — one file per wallet, all implementing `WalletAdapter`
 *   balances     — Horizon balance reads
 *   walletStore  — pure state container
 *   WalletProvider — orchestration + the `useWallet()` hook components consume
 *
 * Import from `@/lib/wallet` rather than reaching into these files directly.
 */

export { WalletProvider, useWallet, type WalletContextValue } from './WalletProvider';
export { useWalletStore } from './walletStore';
export {
  SUPPORTED_WALLETS,
  WALLET_ADAPTERS,
  getWalletAdapter,
  freighterAdapter,
  albedoAdapter,
  xbullAdapter,
  walletConnectAdapter,
} from './adapters';
export { fetchBalances } from './balances';
export { truncateAddress } from './address';
export {
  STELLAR_NETWORK,
  IS_MAINNET,
  HORIZON_URL,
  NETWORK_PASSPHRASE,
  FREIGHTER_NETWORK,
  explorerTxUrl,
  isExpectedNetwork,
} from './network';
export {
  WalletError,
  toWalletErrorState,
  type WalletAdapter,
  type WalletBalances,
  type WalletConnection,
  type WalletErrorCode,
  type WalletErrorState,
  type WalletType,
} from './types';
