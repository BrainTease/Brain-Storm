export interface FormatTokenBalanceOptions {
  /** Maximum fraction digits to display. Defaults to `2`. */
  decimals?: number;
  /** Text shown when `balance` is `null`/`undefined`. Defaults to `'—'`. */
  fallback?: string;
}

/**
 * Formats a raw balance (string or number, as returned by Horizon/the API)
 * into a locale-aware, fixed-precision display string.
 */
export function formatTokenBalance(
  balance: number | string | null | undefined,
  { decimals = 2, fallback = '—' }: FormatTokenBalanceOptions = {}
): string {
  if (balance === null || balance === undefined || balance === '') {
    return fallback;
  }

  const numeric = typeof balance === 'number' ? balance : Number(balance);

  if (Number.isNaN(numeric)) {
    return fallback;
  }

  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

interface TokenBalanceProps {
  /** Raw balance value, as returned by the wallet/API (decimal string or number). */
  balance: number | string | null | undefined;
  /** Token symbol shown after the formatted amount, e.g. `'XLM'` or `'BST'`. */
  symbol: string;
  /** Maximum fraction digits to display. Defaults to `2`. */
  decimals?: number;
  /** Text shown when `balance` is `null`/`undefined`. Defaults to `'—'`. */
  fallback?: string;
  className?: string;
}

export function TokenBalance({
  balance,
  symbol,
  decimals = 2,
  fallback = '—',
  className = '',
}: TokenBalanceProps) {
  const formatted = formatTokenBalance(balance, { decimals, fallback });

  return (
    <span className={className}>
      {formatted} {symbol}
    </span>
  );
}
