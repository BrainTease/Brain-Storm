/**
 * Shared date/number/address formatting helpers used across the Brain-Storm
 * monorepo (frontend, backend, packages).  Previously these helpers were
 * duplicated in `apps/frontend/src/lib/date-utils.ts`,
 * `apps/frontend/src/lib/format.ts`, and `apps/frontend/src/lib/amount-utils.ts`
 * (see issue #1376).  This package is now the single source of truth.
 */

/**
 * Convert various date input formats to a Date object.
 *
 * Accepts Date instances, timestamps, or ISO date strings.  Returns the
 * original Date untouched (no clone) to avoid allocation when the caller
 * already has a Date.
 */
export function toDate(d: Date | number | string): Date {
  return d instanceof Date ? d : new Date(d);
}

// ── Amount / currency ────────────────────────────────────────────────────────

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
  {
    maxFractionDigits = 2,
    placeholder = '—',
  }: { maxFractionDigits?: number; placeholder?: string } = {}
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

/**
 * Format a human-readable amount with asset suffix, suitable for transaction
 * history displays.  Large values are compacted (1.2K, 2.5M).
 *
 * Previously duplicated as `formatAmountHumanReadable` in
 * `packages/app/src/lib/transactions.ts`.
 */
export function formatAmountHumanReadable(amount: string, asset: string): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return `${amount} ${asset}`;

  if (asset === 'XLM') {
    return `${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 7,
    })} XLM`;
  }

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M ${asset}`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(2)}K ${asset}`;
  }

  return `${num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })} ${asset}`;
}

// ── Duration / compact numbers ──────────────────────────────────────────────

/**
 * Formats a duration in seconds as `m:ss` (e.g. `75` → `"1:15"`).
 * Non-finite or negative input is clamped to zero so UI timers never render `NaN`.
 */
export function formatDuration(seconds: number | null | undefined): string {
  const total =
    Number.isFinite(seconds) && (seconds as number) > 0 ? Math.floor(seconds as number) : 0;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Shortens a count for tight layouts: `1234` → `"1.2k"`, `2_500_000` → `"2.5M"`.
 * Values under 1,000 keep up to two decimals when fractional.
 */
export function formatShortNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toFixed(n % 1 === 0 ? 0 : 2);
}

// ── Address formatting ──────────────────────────────────────────────────────

/**
 * Truncate a Stellar public key to `GABC…WXYZ` format for compact display.
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}
