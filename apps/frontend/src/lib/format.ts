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
