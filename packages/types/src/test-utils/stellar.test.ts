import { OnChainCredentialFactory, StellarBalanceFactory } from './stellar';

describe('Stellar test factories', () => {
  it('creates native balance fixtures and applies overrides', () => {
    expect(StellarBalanceFactory.create()).toEqual({
      asset_type: 'native',
      balance: '100.0000000',
    });
    expect(
      StellarBalanceFactory.create({
        asset_type: 'credit_alphanum4',
        asset_code: 'BST',
        asset_issuer: 'G' + 'B'.repeat(55),
        balance: '25.0000000',
      })
    ).toMatchObject({ asset_code: 'BST', balance: '25.0000000' });
  });

  it('creates independent on-chain credential fixtures', () => {
    const [first, second] = OnChainCredentialFactory.createMany(2, {
      courseId: 'course-fixed',
    });

    expect(first).toMatchObject({
      contractId: 'C' + 'A'.repeat(55),
      courseId: 'course-fixed',
      issuedAt: 1_704_067_200,
    });
    expect(first.credentialId).not.toBe(second.credentialId);
    expect(first.txHash).not.toBe(second.txHash);
  });
});
