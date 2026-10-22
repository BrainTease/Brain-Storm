import { useFormatter, useLocale } from 'next-intl';

/**
 * Locale-aware formatting helpers built on next-intl's `useFormatter`.
 * All helpers are client-side hooks; they read the active locale from
 * `NextIntlClientProvider`, so calls re-render when the user switches language.
 */

export function useDateFormatter() {
  const format = useFormatter();
  return {
    short: (d: Date | number | string) => format.dateTime(toDate(d), { dateStyle: 'medium' }),
    long: (d: Date | number | string) =>
      format.dateTime(toDate(d), { dateStyle: 'long', timeStyle: 'short' }),
    relative: (d: Date | number | string, now: Date = new Date()) =>
      format.relativeTime(toDate(d), now),
  };
}

export function useNumberFormatter() {
  const format = useFormatter();
  const locale = useLocale();
  return {
    decimal: (n: number) => format.number(n),
    percent: (n: number) => format.number(n, { style: 'percent', maximumFractionDigits: 0 }),
    compact: (n: number) =>
      new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(n),
    currency: (n: number, currency = 'USD') => format.number(n, { style: 'currency', currency }),
  };
}

function toDate(d: Date | number | string): Date {
  return d instanceof Date ? d : new Date(d);
}

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
