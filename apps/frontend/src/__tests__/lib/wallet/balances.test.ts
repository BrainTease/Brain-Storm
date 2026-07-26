import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchBalances } from '@/lib/wallet/balances';
import { WalletError } from '@/lib/wallet/types';

function mockHorizon(response: unknown, ok = true) {
  const fetchMock = vi.fn(() =>
    Promise.resolve({ ok, json: () => Promise.resolve(response) } as Response)
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchBalances', () => {
  it('reads XLM and BST from a single Horizon request', async () => {
    const fetchMock = mockHorizon({
      balances: [
        { asset_type: 'native', balance: '100.5' },
        { asset_type: 'credit_alphanum4', asset_code: 'BST', balance: '42.0' },
      ],
    });

    await expect(fetchBalances('GABC')).resolves.toEqual({ xlm: '100.5', bst: '42.0' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to zero for assets the account does not hold', async () => {
    mockHorizon({ balances: [{ asset_type: 'native', balance: '7' }] });
    await expect(fetchBalances('GABC')).resolves.toEqual({ xlm: '7', bst: '0' });
  });

  it('tolerates a response with no balances array', async () => {
    mockHorizon({});
    await expect(fetchBalances('GABC')).resolves.toEqual({ xlm: '0', bst: '0' });
  });

  it('throws a coded WalletError when Horizon rejects the request', async () => {
    mockHorizon({}, false);
    await expect(fetchBalances('GABC')).rejects.toMatchObject({
      code: 'BALANCE_FETCH_FAILED',
    });
    await expect(fetchBalances('GABC')).rejects.toBeInstanceOf(WalletError);
  });
});
