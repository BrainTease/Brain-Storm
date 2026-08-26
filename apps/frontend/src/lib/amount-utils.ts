/**
 * Shared amount formatting utilities for consistent number/currency presentation.
 * Replaces ad-hoc toFixed/string-concatenation formatting scattered across components.
 */

const STROOPS_PER_XLM = 10_000_000;

/**
 * Convert a raw Stellar amount (a decimal string or number, as returned by
 * Horizon) into a plain number of stroops.
 */
export function toStroops(amount: number | string): number {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * STROOPS_PER_XLM);
}

/**
 * Convert a stroops amount into whole XLM.
 */
export function stroopsToXlm(stroops: number | string): number {
  const n = typeof stroops === 'string' ? Number(stroops) : stroops;
  if (!Number.isFinite(n)) return 0;
  return n / STROOPS_PER_XLM;
}

/**
 * Format a numeric amount with thousands separators and a bounded number of
 * fraction digits, trimming trailing zeros. Handles null/undefined, 0,
 * negative values, and very large numbers.
 */
export function formatAmount(
  amount: number | string | null | undefined,
  { maxFractionDigits = 2, placeholder = '—' }: { maxFractionDigits?: number; placeholder?: string } = {}
): string {
  if (amount === null || amount === undefined || amount === '') return placeholder;
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) return placeholder;

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(n);
}

/**
 * Format an XLM balance (already in XLM units, as returned by Horizon) for
 * display, e.g. "1,234.5" or "0" for a zero balance.
 */
export function formatXlm(
  amount: number | string | null | undefined,
  options: { maxFractionDigits?: number; placeholder?: string } = {}
): string {
  return formatAmount(amount, { maxFractionDigits: 7, ...options });
}
