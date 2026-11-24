import type { OnChainCredential, StellarBalance } from '../stellar.types';

let fixtureId = 0;

function nextFixtureId(): string {
  fixtureId += 1;
  return `stellar-test-${fixtureId}`;
}

export class StellarBalanceFactory {
  static create(overrides: Partial<StellarBalance> = {}): StellarBalance {
    return {
      asset_type: 'native',
      balance: '100.0000000',
      ...overrides,
    };
  }

  static createMany(count: number, overrides: Partial<StellarBalance> = {}): StellarBalance[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}

export class OnChainCredentialFactory {
  static create(overrides: Partial<OnChainCredential> = {}): OnChainCredential {
    const id = nextFixtureId();
    return {
      contractId: 'C' + 'A'.repeat(55),
      credentialId: `credential-${id}`,
      recipientPublicKey: 'G' + 'A'.repeat(55),
      courseId: `course-${id}`,
      issuedAt: 1_704_067_200,
      txHash: `transaction-${id}`,
      ...overrides,
    };
  }

  static createMany(
    count: number,
    overrides: Partial<OnChainCredential> = {}
  ): OnChainCredential[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
