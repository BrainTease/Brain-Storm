/**
 * FakeHorizonServer — Issue #1349
 *
 * A reusable fake Stellar Horizon server for unit and integration tests.
 * Provides fixture-based responses for the Horizon API methods used
 * across the backend (loadAccount, submitTransaction, transactions).
 *
 * Usage:
 *
 *   import { FakeHorizonServer } from '../test/mock-horizon-server';
 *
 *   const fakeServer = new FakeHorizonServer();
 *   fakeServer.setAccount('GABC...', { balances: [...] });
 *   fakeServer.setTransactionResult('HASH123', { hash: 'HASH123', ledger: 1, ... });
 *
 *   // In a jest.mock factory:
 *   jest.mock('@stellar/stellar-sdk', () => {
 *     const actual = jest.requireActual('@stellar/stellar-sdk');
 *     return {
 *       ...actual,
 *       Horizon: { Server: jest.fn(() => fakeServer.server) },
 *     };
 *   });
 *
 *   // Or directly as a Nest provider override:
 *   { provide: ..., useValue: fakeServer.server }
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A single Horizon account fixture. */
export interface HorizonAccountFixture {
  id: string;
  accountId: string;
  sequence: string;
  balances: Array<Record<string, any>>;
  signers?: Array<Record<string, any>>;
  data?: Record<string, any>;
  thresholds?: Record<string, any>;
}

/** A single Horizon transaction fixture. */
export interface HorizonTransactionFixture {
  hash: string;
  successful: boolean;
  ledger: number;
  ledger_attr: number;
  created_at: string;
  operation_count: number;
  source_account?: string;
  paging_token?: string;
}

/** Submit-transaction response fixture. */
export interface HorizonSubmitResultFixture {
  hash: string;
  ledger: number;
  paging_token?: string;
  successful?: boolean;
}

/** Options for building a fixture response. */
export interface FakeHorizonServerOptions {
  /** Default passphrase returned by getNetworkPassphrase (unused here). */
  defaultNetworkPassphrase?: string;
}

/**
 * Reusable fake Horizon server.
 *
 * Wraps a plain object whose method signatures match the subset of the
 * `Horizon.Server` API surface used by the backend (loadAccount,
 * submitTransaction, transactions().transaction().call()).  Tests
 * register fixture responses and the fake returns them deterministically.
 */
export class FakeHorizonServer {
  /** The mock object that quacks like a `Horizon.Server`. */
  readonly server: any;

  private accounts = new Map<string, HorizonAccountFixture>();
  private txResults = new Map<string, HorizonTransactionFixture>();
  private submitResults: HorizonSubmitResultFixture[] = [];
  private submitCallIndex = 0;
  private submitDefault: HorizonSubmitResultFixture = { hash: 'FAKE_TX_HASH', ledger: 1 };
  private submitErrors: Error[] = [];
  private loadAccountErrors = new Map<string, Error>();
  private submittedTransactions: any[] = [];

  constructor(_options?: FakeHorizonServerOptions) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;

    this.server = {
      loadAccount: jest.fn(async (publicKey: string) => {
        if (self.loadAccountErrors.has(publicKey)) {
          throw self.loadAccountErrors.get(publicKey)!;
        }
        const fixture = self.accounts.get(publicKey);
        if (!fixture) {
          const err = new Error(`Account not found: ${publicKey}`);
          (err as any).response = { status: 404 };
          throw err;
        }
        return {
          id: fixture.id,
          accountId: fixture.accountId,
          sequence: fixture.sequence,
          sequenceNumber: () => fixture.sequence,
          balances: fixture.balances,
          signers: fixture.signers ?? [],
          data: fixture.data ?? {},
          thresholds: fixture.thresholds ?? { low_threshold: 0, med_threshold: 0, high_threshold: 0 },
        };
      }),

      submitTransaction: jest.fn(async (tx: any) => {
        self.submittedTransactions.push(tx);

        if (self.submitErrors.length > 0 && self.submitCallIndex < self.submitErrors.length) {
          const err = self.submitErrors[self.submitCallIndex];
          self.submitCallIndex++;
          throw err;
        }

        if (self.submitResults.length > 0 && self.submitCallIndex < self.submitResults.length) {
          const result = self.submitResults[self.submitCallIndex];
          self.submitCallIndex++;
          return result;
        }

        self.submitCallIndex++;
        return self.submitDefault;
      }),

      transactions: jest.fn(() => ({
        transaction: jest.fn((txHash: string) => ({
          call: jest.fn(async () => {
            const fixture = self.txResults.get(txHash);
            if (!fixture) {
              throw new Error(`Transaction not found: ${txHash}`);
            }
            return {
              successful: fixture.successful,
              hash: fixture.hash,
              ledger_attr: fixture.ledger_attr,
              ledger: fixture.ledger,
              created_at: fixture.created_at,
              operation_count: fixture.operation_count,
              source_account: fixture.source_account ?? '',
              paging_token: fixture.paging_token ?? '',
            };
          }),
        })),
      })),

      // Pass-through for any other chainable call (e.g. effects, payments).
      // Returns an empty collection-like object so code that calls
      // `.call()` without throwing.
      effects: jest.fn(() => ({
        call: jest.fn().mockResolvedValue({ records: [] }),
      })),
      payments: jest.fn(() => ({
        call: jest.fn().mockResolvedValue({ records: [] }),
      })),
    };
  }

  // ── Fixture registration ───────────────────────────────────────────────

  /** Register a fixture account that `loadAccount` will return. */
  setAccount(publicKey: string, fixture: Partial<HorizonAccountFixture>): void {
    this.accounts.set(publicKey, {
      id: publicKey,
      accountId: publicKey,
      sequence: '1',
      balances: [],
      ...fixture,
    });
  }

  /** Register a fixture transaction that `transactions().transaction(hash).call()` returns. */
  setTransactionResult(txHash: string, fixture: Partial<HorizonTransactionFixture>): void {
    this.txResults.set(txHash, {
      hash: txHash,
      successful: true,
      ledger: 1,
      ledger_attr: 1,
      created_at: '2026-01-01T00:00:00Z',
      operation_count: 1,
      ...fixture,
    });
  }

  /**
   * Queue specific submit-transaction results in order.
   * Each call to `submitTransaction` pops the next one.
   */
  setSubmitResults(results: HorizonSubmitResultFixture[]): void {
    this.submitResults = [...results];
    this.submitCallIndex = 0;
  }

  /** Set a single submit-transaction result (shorthand for `setSubmitResults([r])`). */
  setSubmitResult(result: HorizonSubmitResultFixture): void {
    this.setSubmitResults([result]);
  }

  /**
   * Queue errors for submitTransaction in order.
   * When an error is queued it takes precedence over a result at the same index.
   */
  setSubmitErrors(errors: Error[]): void {
    this.submitErrors = [...errors];
    this.submitCallIndex = 0;
  }

  /** Make the next `submitTransaction` call throw. */
  setSubmitError(error: Error): void {
    this.setSubmitErrors([error]);
  }

  /** Set a default submit result used when no queued results remain. */
  setDefaultSubmitResult(result: HorizonSubmitResultFixture): void {
    this.submitDefault = result;
  }

  /** Make `loadAccount` throw for a specific key (e.g. simulate 404). */
  setLoadAccountError(publicKey: string, error: Error): void {
    this.loadAccountErrors.set(publicKey, error);
  }

  // ── Assertion helpers ──────────────────────────────────────────────────

  /** Get all transactions passed to `submitTransaction`. */
  getSubmittedTransactions(): any[] {
    return this.submittedTransactions;
  }

  /** Get the number of times `submitTransaction` was called. */
  getSubmitCount(): number {
    return this.submitCallIndex;
  }

  /** Reset all fixtures and call counters (use in `beforeEach`). */
  reset(): void {
    this.accounts.clear();
    this.txResults.clear();
    this.submitResults = [];
    this.submitErrors = [];
    this.submitCallIndex = 0;
    this.submitDefault = { hash: 'FAKE_TX_HASH', ledger: 1 };
    this.loadAccountErrors.clear();
    this.submittedTransactions = [];

    this.server.loadAccount.mockClear();
    this.server.submitTransaction.mockClear();
    this.server.transactions.mockClear();
  }
}
