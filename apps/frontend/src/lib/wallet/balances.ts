import { HORIZON_URL } from './network';
import { WalletError, type WalletBalances } from './types';

interface HorizonBalance {
  asset_type: string;
  asset_code?: string;
  balance: string;
}

/**
 * Fetch every balance the app displays in a single Horizon call.
 *
 * The previous implementation fetched `/accounts/{address}` twice — once per
 * asset — doubling the request count on every connect and refresh.
 */
export async function fetchBalances(address: string): Promise<WalletBalances> {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (!res.ok) {
    throw new WalletError('BALANCE_FETCH_FAILED', 'Could not load balances from Horizon.');
  }

  const data = (await res.json()) as { balances?: HorizonBalance[] };
  const balances = data.balances ?? [];

  return {
    xlm: balances.find((b) => b.asset_type === 'native')?.balance ?? '0',
    bst: balances.find((b) => b.asset_code === 'BST')?.balance ?? '0',
  };
}
