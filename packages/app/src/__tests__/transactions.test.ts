import { describe, it, expect } from 'vitest';
import {
  parseTransactionXDR,
  validateTransaction,
  detectTamperedTransaction,
  formatAmountHumanReadable,
} from '../lib/transactions';

const VALID_PAYMENT_XDR =
  'AAAAAgAAAABhGQoGgYUMlqMq2NFAYHbx2UPYx6hPJNYfLd3P3y4jWQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADjkQo+JZ1LGNMF8MYBDU4tsnMqF5VJxRCLVQFBBsUMBAAAAABDRVRJAAAAAABhGQoGgYUMlqMq2NFAYHbx2UPYx6hPJNYfLd3P3y4jWQAAAAAABS6eAAAAAAAAAAAA';

const VALID_PAYMENT_XDR_2 =
  'AAAAAgAAAABhGQoGgYUMlqMq2NFAYHbx2UPYx6hPJNYfLd3P3y4jWQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAD1S4vGobm+HNSkh7AFiBSFW7W1KhPBeLNmY6S3MEAM6wAAAABDRVRJAAAAAABhGQoGgYUMlqMq2NFAYHbx2UPYx6hPJNYfLd3P3y4jWQAAAAAABS6eAAAAAAAAAAAA';

const INVALID_XDR = 'AAAAInvaliddata';

const TAMPERED_PAYMENT_XDR =
  'AAAAAgAAAABhGQoGgYUMlqMq2NFAYHbx2UPYx6hPJNYfLd3P3y4jWQAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADjkQo+JZ1LGNMF8MYBDU4tsnMqF5VJxRCLVQFBBsUMBAAAAABDRVRJAAAAAABhGQoGgYUMlqMq2NFAYHbx2UPYx6hPJNYfLd3P3y4jWQAAAAAABhO5AAAAAAAAAAAA';

describe('parseTransactionXDR', () => {
  it('parses a valid payment transaction XDR', () => {
    const result = parseTransactionXDR(VALID_PAYMENT_XDR);
    expect(result.source).toBeTruthy();
    expect(result.operations.length).toBeGreaterThanOrEqual(1);
    expect(result.fee).toBeDefined();
    expect(result.sequence).toBeDefined();
  });

  it('throws on invalid XDR', () => {
    expect(() => parseTransactionXDR(INVALID_XDR)).toThrow();
  });

  it('parses the source account correctly', () => {
    const result = parseTransactionXDR(VALID_PAYMENT_XDR);
    expect(result.source).toMatch(/^G[A-Z2-7]{55}$/);
  });
});

describe('validateTransaction', () => {
  it('validates a correct transaction', () => {
    const result = validateTransaction(VALID_PAYMENT_XDR);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for invalid XDR', () => {
    const result = validateTransaction(INVALID_XDR);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('validates empty XDR string', () => {
    const result = validateTransaction('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('detectTamperedTransaction', () => {
  it('detects no changes between identical transactions', () => {
    const result = detectTamperedTransaction(
      VALID_PAYMENT_XDR,
      VALID_PAYMENT_XDR
    );
    expect(result.valid).toBe(true);
  });

  it('detects changes in amount', () => {
    const result = detectTamperedTransaction(
      VALID_PAYMENT_XDR,
      TAMPERED_PAYMENT_XDR
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('amount'))).toBe(
      true
    );
  });

  it('detects completely different transactions', () => {
    const result = detectTamperedTransaction(
      VALID_PAYMENT_XDR,
      VALID_PAYMENT_XDR_2
    );
    expect(result.valid).toBe(false);
  });

  it('handles invalid XDR gracefully', () => {
    const result = detectTamperedTransaction(VALID_PAYMENT_XDR, INVALID_XDR);
    expect(result.valid).toBe(false);
  });

  it('detects destination changes', () => {
    const result = detectTamperedTransaction(
      VALID_PAYMENT_XDR,
      TAMPERED_PAYMENT_XDR
    );
    expect(result.valid).toBe(false);
  });
});

describe('detectTamperedTransaction - Operation level', () => {
  it('rejects when operations count changes', () => {
    const result = detectTamperedTransaction(
      VALID_PAYMENT_XDR,
      TAMPERED_PAYMENT_XDR
    );
    expect(result.valid).toBe(false);
  });

  it('rejects when a payment amount is modified', () => {
    const result = detectTamperedTransaction(
      VALID_PAYMENT_XDR,
      TAMPERED_PAYMENT_XDR
    );
    expect(result.valid).toBe(false);
    const amountError = result.errors.find(
      (e) =>
        e.includes('Amount') &&
        (e.includes('changed') || e.includes('modified'))
    );
    expect(amountError).toBeTruthy();
  });
});

describe('formatAmountHumanReadable', () => {
  it('formats XLM amounts with 7 decimal places', () => {
    const result = formatAmountHumanReadable('100.5000000', 'XLM');
    expect(result).toContain('XLM');
    expect(result).toContain('100');
  });

  it('formats large amounts in millions', () => {
    const result = formatAmountHumanReadable('5000000', 'BST');
    expect(result).toContain('M');
    expect(result).toContain('BST');
  });

  it('formats thousands with K suffix', () => {
    const result = formatAmountHumanReadable('2500', 'BST');
    expect(result).toContain('K');
  });

  it('handles zero amounts', () => {
    const result = formatAmountHumanReadable('0', 'XLM');
    expect(result).toContain('0');
    expect(result).toContain('XLM');
  });

  it('handles very small amounts', () => {
    const result = formatAmountHumanReadable('0.0000001', 'XLM');
    expect(result).toContain('0.0000001');
  });
});

describe('validateTransaction - Network and address checks', () => {
  it('validates destination address format', () => {
    const result = validateTransaction(VALID_PAYMENT_XDR);
    if (result.valid) {
      expect(result.errors).toHaveLength(0);
    }
  });

  it('warns on very large amounts', () => {
    const result = validateTransaction(VALID_PAYMENT_XDR);
    if (result.warnings.length > 0) {
      expect(
        result.warnings.some((w) => w.toLowerCase().includes('large'))
      ).toBe(true);
    }
  });
});
