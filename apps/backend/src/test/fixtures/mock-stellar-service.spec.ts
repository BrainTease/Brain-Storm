import {
  createMockStellarService,
  MOCK_STELLAR_PUBLIC_KEY,
  MOCK_STELLAR_TX_HASH,
} from './mock-stellar-service';

describe('createMockStellarService', () => {
  it('provides isolated service and Horizon mocks with deterministic defaults', async () => {
    const first = createMockStellarService();
    const second = createMockStellarService();

    await expect(first.service.getAccountBalance(MOCK_STELLAR_PUBLIC_KEY)).resolves.toHaveLength(2);
    await expect(first.horizon.loadAccount(MOCK_STELLAR_PUBLIC_KEY)).resolves.toMatchObject({
      balances: expect.arrayContaining([expect.objectContaining({ asset_type: 'native' })]),
    });
    await expect(first.service.verifyTransaction(MOCK_STELLAR_TX_HASH)).resolves.toMatchObject({
      verified: true,
      hash: MOCK_STELLAR_TX_HASH,
    });
    expect(first.service.getAccountBalance).not.toBe(second.service.getAccountBalance);
  });

  it('supports independent failure and balance fixtures', async () => {
    const fixture = createMockStellarService({
      balances: [],
      transaction: { successful: false },
      txHash: 'unverified-transaction',
    });

    await expect(fixture.service.getAccountBalance(MOCK_STELLAR_PUBLIC_KEY)).resolves.toEqual([]);
    await expect(
      fixture.horizon.transactions().transaction('unverified-transaction').call()
    ).resolves.toMatchObject({
      successful: false,
      hash: 'unverified-transaction',
    });
  });
});
