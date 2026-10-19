import {
  toDate,
  toStroops,
  stroopsToXlm,
  formatAmount,
  formatXlm,
  formatAmountHumanReadable,
  formatDuration,
  formatShortNumber,
  truncateAddress,
} from './index';

describe('@brain-storm/utils', () => {
  // ── toDate ────────────────────────────────────────────────────────────────
  describe('toDate', () => {
    it('returns the same Date instance when given a Date', () => {
      const d = new Date('2024-01-15T00:00:00Z');
      expect(toDate(d)).toBe(d);
    });

    it('parses ISO strings', () => {
      expect(toDate('2024-01-15').toISOString()).toBe(
        new Date('2024-01-15').toISOString()
      );
    });

    it('parses timestamps', () => {
      const ts = 1700000000000;
      expect(toDate(ts).getTime()).toBe(ts);
    });
  });

  // ── toStroops / stroopsToXlm ──────────────────────────────────────────────
  describe('toStroops', () => {
    it('converts XLM to stroops', () => {
      expect(toStroops(1)).toBe(10_000_000);
      expect(toStroops('0.5')).toBe(5_000_000);
    });

    it('returns 0 for non-finite input', () => {
      expect(toStroops('abc')).toBe(0);
      expect(toStroops(Infinity)).toBe(0);
    });
  });

  describe('stroopsToXlm', () => {
    it('converts stroops to XLM', () => {
      expect(stroopsToXlm(10_000_000)).toBe(1);
      expect(stroopsToXlm('5_000_000')).toBe(0.5);
    });
  });

  // ── formatAmount ──────────────────────────────────────────────────────────
  describe('formatAmount', () => {
    it('formats with thousands separators', () => {
      expect(formatAmount(1234.56)).toBe('1,234.56');
    });

    it('respects maxFractionDigits', () => {
      expect(formatAmount(1234.5678, { maxFractionDigits: 2 })).toBe('1,234.57');
    });

    it('returns placeholder for null/undefined/empty', () => {
      expect(formatAmount(null)).toBe('—');
      expect(formatAmount(undefined)).toBe('—');
      expect(formatAmount('')).toBe('—');
    });

    it('returns placeholder for non-finite numbers', () => {
      expect(formatAmount(NaN)).toBe('—');
      expect(formatAmount(Infinity)).toBe('—');
    });
  });

  // ── formatXlm ──────────────────────────────────────────────────────────────
  describe('formatXlm', () => {
    it('formats with up to 7 decimal digits', () => {
      expect(formatXlm(1234.5678901)).toBe('1,234.5678901');
    });

    it('formats zero balance', () => {
      expect(formatXlm(0)).toBe('0');
    });
  });

  // ── formatAmountHumanReadable ──────────────────────────────────────────────
  describe('formatAmountHumanReadable', () => {
    it('formats XLM amounts with the XLM suffix', () => {
      expect(formatAmountHumanReadable('100.5', 'XLM')).toBe('100.50 XLM');
    });

    it('compacts large non-XLM amounts', () => {
      expect(formatAmountHumanReadable('2500000', 'BST')).toBe('2.50M BST');
      expect(formatAmountHumanReadable('1500', 'BST')).toBe('1.50K BST');
    });

    it('returns raw value for non-numeric input', () => {
      expect(formatAmountHumanReadable('N/A', 'XLM')).toBe('N/A XLM');
    });
  });

  // ── formatDuration ─────────────────────────────────────────────────────────
  describe('formatDuration', () => {
    it('formats seconds as m:ss', () => {
      expect(formatDuration(75)).toBe('1:15');
      expect(formatDuration(0)).toBe('0:00');
    });

    it('clamps non-finite or negative to zero', () => {
      expect(formatDuration(NaN)).toBe('0:00');
      expect(formatDuration(-5)).toBe('0:00');
    });
  });

  // ── formatShortNumber ──────────────────────────────────────────────────────
  describe('formatShortNumber', () => {
    it('compacts millions', () => {
      expect(formatShortNumber(2_500_000)).toBe('2.5M');
    });

    it('compacts thousands', () => {
      expect(formatShortNumber(1_234)).toBe('1.2k');
    });

    it('keeps small numbers as-is', () => {
      expect(formatShortNumber(42)).toBe('42');
      expect(formatShortNumber(3.14)).toBe('3.14');
    });
  });

  // ── truncateAddress ────────────────────────────────────────────────────────
  describe('truncateAddress', () => {
    it('truncates long addresses to first-4 … last-4', () => {
      expect(truncateAddress('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890')).toBe(
        'GABC…7890'
      );
    });

    it('returns short addresses unchanged', () => {
      expect(truncateAddress('GABC')).toBe('GABC');
    });

    it('handles empty input', () => {
      expect(truncateAddress('')).toBe('');
    });
  });
});
