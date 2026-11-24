import type { StellarBalance } from '@brain-storm/types';

export const MOCK_STELLAR_PUBLIC_KEY = 'GB' + 'A'.repeat(54);
export const MOCK_STELLAR_TX_HASH = 'mock-stellar-transaction';

export interface MockHorizonTransaction {
  successful: boolean;
  hash: string;
  ledger_attr: number;
  created_at: string;
  operation_count: number;
}

export interface MockStellarOptions {
  balances?: StellarBalance[];
  transaction?: Partial<MockHorizonTransaction>;
  txHash?: string;
}

const DEFAULT_BALANCES: StellarBalance[] = [
  { asset_type: 'native', balance: '100.0000000' },
  {
    asset_type: 'credit_alphanum4',
    asset_code: 'BST',
    asset_issuer: MOCK_STELLAR_PUBLIC_KEY,
    balance: '500.0000000',
  },
];

const DEFAULT_TRANSACTION: MockHorizonTransaction = {
  successful: true,
  hash: MOCK_STELLAR_TX_HASH,
  ledger_attr: 42,
  created_at: '2026-01-01T00:00:00.000Z',
  operation_count: 1,
};

export function createMockStellarService(options: MockStellarOptions = {}) {
  const balances = options.balances ?? DEFAULT_BALANCES.map((balance) => ({ ...balance }));
  const txHash = options.txHash ?? MOCK_STELLAR_TX_HASH;
  const transaction = { ...DEFAULT_TRANSACTION, hash: txHash, ...options.transaction };

  const call = jest.fn().mockResolvedValue(transaction);
  const horizonTransaction = jest.fn().mockReturnValue({ call });
  const transactions = jest.fn().mockReturnValue({ transaction: horizonTransaction });
  const loadAccount = jest.fn().mockResolvedValue({ balances });

  return {
    horizon: { call, horizonTransaction, loadAccount, transactions },
    service: {
      getAccountBalance: jest.fn().mockResolvedValue(balances),
      issueCredential: jest.fn().mockResolvedValue(txHash),
      mintReward: jest.fn().mockResolvedValue(txHash),
      verifyTransaction: jest.fn().mockResolvedValue({
        verified: transaction.successful,
        hash: transaction.hash,
        ledger: transaction.ledger_attr,
        createdAt: transaction.created_at,
        operationCount: transaction.operation_count,
      }),
    },
  };
}
