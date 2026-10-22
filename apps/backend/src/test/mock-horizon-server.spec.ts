/**
 * Tests for the FakeHorizonServer test utility — Issue #1349
 *
 * Verifies that the reusable fake Horizon server returns fixture
 * responses correctly for loadAccount, submitTransaction, and
 * transactions().transaction().call().
 */

import { FakeHorizonServer } from './mock-horizon-server';

describe('FakeHorizonServer', () => {
  let fake: FakeHorizonServer;

  beforeEach(() => {
    fake = new FakeHorizonServer();
  });

  describe('loadAccount', () => {
    it('returns fixture balances for a registered account', async () => {
      const balances = [
        { asset_type: 'native', balance: '100.0000000' },
        { asset_type: 'credit_alphanum4', asset_code: 'BST', balance: '500.0000000' },
      ];
      fake.setAccount('GABC123', { balances });

      const account = await fake.server.loadAccount('GABC123');

      expect(account.balances).toEqual(balances);
      expect(account.accountId).toBe('GABC123');
      expect(account.sequenceNumber()).toBe('1');
    });

    it('throws a 404-like error for an unregistered account', async () => {
      await expect(fake.server.loadAccount('GUNKNOWN')).rejects.toThrow(
        'Account not found: GUNKNOWN'
      );
    });

    it('throws a custom error when set via setLoadAccountError', async () => {
      fake.setLoadAccountError('GFAIL', new Error('network timeout'));

      await expect(fake.server.loadAccount('GFAIL')).rejects.toThrow('network timeout');
    });
  });

  describe('submitTransaction', () => {
    it('returns the default fixture result when no results are queued', async () => {
      const result = await fake.server.submitTransaction({});

      expect(result.hash).toBe('FAKE_TX_HASH');
      expect(result.ledger).toBe(1);
    });

    it('returns queued results in order', async () => {
      fake.setSubmitResults([
        { hash: 'HASH_1', ledger: 10 },
        { hash: 'HASH_2', ledger: 20 },
      ]);

      const r1 = await fake.server.submitTransaction({});
      const r2 = await fake.server.submitTransaction({});

      expect(r1.hash).toBe('HASH_1');
      expect(r1.ledger).toBe(10);
      expect(r2.hash).toBe('HASH_2');
      expect(r2.ledger).toBe(20);
    });

    it('falls back to the default after queued results are exhausted', async () => {
      fake.setSubmitResult({ hash: 'QUEUED', ledger: 99 });

      await fake.server.submitTransaction({});
      const second = await fake.server.submitTransaction({});

      expect(second.hash).toBe('FAKE_TX_HASH');
    });

    it('throws when a submit error is queued', async () => {
      fake.setSubmitError(new Error('Horizon 503'));

      await expect(fake.server.submitTransaction({})).rejects.toThrow('Horizon 503');
    });

    it('records submitted transactions for assertion', async () => {
      const tx1 = { hash: 'tx1' };
      const tx2 = { hash: 'tx2' };

      await fake.server.submitTransaction(tx1);
      await fake.server.submitTransaction(tx2);

      expect(fake.getSubmittedTransactions()).toEqual([tx1, tx2]);
      expect(fake.getSubmitCount()).toBe(2);
    });

    it('honours a custom default submit result', async () => {
      fake.setDefaultSubmitResult({ hash: 'CUSTOM_DEFAULT', ledger: 42 });

      const result = await fake.server.submitTransaction({});

      expect(result.hash).toBe('CUSTOM_DEFAULT');
      expect(result.ledger).toBe(42);
    });
  });

  describe('transactions', () => {
    it('returns a fixture transaction by hash', async () => {
      fake.setTransactionResult('TXHASH123', {
        successful: true,
        ledger_attr: 12345,
        created_at: '2026-01-01T00:00:00Z',
        operation_count: 2,
      });

      const tx = await fake.server.transactions().transaction('TXHASH123').call();

      expect(tx.successful).toBe(true);
      expect(tx.hash).toBe('TXHASH123');
      expect(tx.ledger_attr).toBe(12345);
      expect(tx.created_at).toBe('2026-01-01T00:00:00Z');
      expect(tx.operation_count).toBe(2);
    });

    it('throws for an unregistered transaction hash', async () => {
      await expect(
        fake.server.transactions().transaction('MISSING').call()
      ).rejects.toThrow('Transaction not found: MISSING');
    });
  });

  describe('reset', () => {
    it('clears all fixtures and call counters', async () => {
      fake.setAccount('GRESET', { balances: [{ asset_type: 'native', balance: '1' }] });
      fake.setSubmitResult({ hash: 'QUEUED', ledger: 5 });
      await fake.server.loadAccount('GRESET');
      await fake.server.submitTransaction({});

      fake.reset();

      await expect(fake.server.loadAccount('GRESET')).rejects.toThrow();
      const result = await fake.server.submitTransaction({});
      expect(result.hash).toBe('FAKE_TX_HASH');
      expect(fake.getSubmitCount()).toBe(1);
      expect(fake.server.loadAccount).toHaveBeenCalledTimes(1);
    });
  });
});
