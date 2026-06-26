import {
  isConnected,
  getPublicKey,
  getNetwork,
  signTransaction,
} from '@stellar/freighter-api';

export function isFreighterInstalled(): boolean {
  return typeof window !== 'undefined' && !!window.freighter;
}

export async function connectFreighter(): Promise<{ publicKey: string; network: string }> {
  const { isConnected: connected } = await isConnected();
  if (!connected) {
    throw new Error('FREIGHTER_NOT_CONNECTED');
  }
  const { publicKey, error: pkError } = await getPublicKey();
  if (pkError) throw new Error(pkError);
  const { network, networkPassphrase, error: netError } = await getNetwork();
  if (netError) throw new Error(netError);
  return { publicKey, network: network || networkPassphrase };
}

export async function getFreighterNetwork(): Promise<string> {
  const { network, networkPassphrase, error } = await getNetwork();
  if (error) throw new Error(error);
  return network || networkPassphrase;
}

export async function signWithFreighter(xdr: string, network: string): Promise<string> {
  const { signedTransaction, error } = await signTransaction(xdr, { network });
  if (error) throw new Error(error);
  return signedTransaction;
}

export async function fetchXlmBalance(address: string): Promise<string> {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  const horizonUrl =
    network === 'mainnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';

  const res = await fetch(`${horizonUrl}/accounts/${address}`);
  if (!res.ok) throw new Error('BALANCE_FETCH_FAILED');
  const data = await res.json();
  const xlmBalance = data.balances?.find(
    (b: { asset_type: string }) => b.asset_type === 'native'
  );
  return xlmBalance ? xlmBalance.balance : '0';
}

export async function fetchBstBalance(address: string): Promise<string> {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  const horizonUrl =
    network === 'mainnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org';

  const res = await fetch(`${horizonUrl}/accounts/${address}`);
  if (!res.ok) return '0';
  const data = await res.json();
  const bst = data.balances?.find(
    (b: { asset_type: string; asset_code?: string }) => b.asset_code === 'BST'
  );
  return bst ? bst.balance : '0';
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
