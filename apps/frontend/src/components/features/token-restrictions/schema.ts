/**
 * Token-restriction rule schema — issue #966
 *
 * ⚠️  WARNING: Adding a new restriction type only requires adding an entry here.
 * The TokenRestrictionsPanel renders generically from this schema — no UI code change needed.
 *
 * Shared with the SDK layer: import from '@/components/features/token-restrictions/schema'
 */

// ---------------------------------------------------------------------------
// Primitive value types a restriction can carry
// ---------------------------------------------------------------------------
export type RestrictionValueType = 'amount' | 'address' | 'percentage' | 'duration' | 'boolean';

// ---------------------------------------------------------------------------
// A single restriction-rule descriptor
// ---------------------------------------------------------------------------
export interface RestrictionRule {
  /** Stable machine-readable key (matches on-chain contract field names). */
  key: string;
  /** Human-readable label shown in the panel header. */
  label: string;
  /** Short description rendered as secondary text below the label. */
  description: string;
  /** Controls how the value is formatted in the row. */
  valueType: RestrictionValueType;
  /** Tailwind colour classes applied to the value badge. */
  badgeClass?: string;
}

// ---------------------------------------------------------------------------
// Registry — extend by adding entries here only
// ---------------------------------------------------------------------------
export const RESTRICTION_RULES: RestrictionRule[] = [
  {
    key: 'transfer_locked',
    label: 'Transfer Lock',
    description: 'Prevents token holders from transferring tokens.',
    valueType: 'boolean',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    key: 'max_balance',
    label: 'Maximum Balance',
    description: 'Upper bound on the amount a single account may hold.',
    valueType: 'amount',
    badgeClass: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  {
    key: 'min_hold_duration',
    label: 'Minimum Hold Duration',
    description: 'Minimum time tokens must be held before transfer.',
    valueType: 'duration',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    key: 'allowlist_only',
    label: 'Allowlist Only',
    description: 'Restricts transfers to addresses on the allowlist.',
    valueType: 'boolean',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    key: 'burn_rate',
    label: 'Burn Rate',
    description: 'Percentage of each transfer automatically burned.',
    valueType: 'percentage',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up a rule descriptor by its key. Returns undefined for unknown keys. */
export function findRule(key: string): RestrictionRule | undefined {
  return RESTRICTION_RULES.find((r) => r.key === key);
}

/** Format a raw value according to the rule's valueType. */
export function formatValue(value: unknown, valueType: RestrictionValueType): string {
  switch (valueType) {
    case 'boolean':
      return value ? 'Enabled' : 'Disabled';
    case 'amount':
      return typeof value === 'number' || typeof value === 'string'
        ? `${Number(value).toLocaleString()} tokens`
        : String(value);
    case 'percentage':
      return typeof value === 'number' || typeof value === 'string'
        ? `${value}%`
        : String(value);
    case 'duration':
      if (typeof value === 'number') {
        const days = Math.floor(value / 86400);
        if (days > 0) return `${days} day${days !== 1 ? 's' : ''}`;
        const hours = Math.floor(value / 3600);
        if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
        return `${value}s`;
      }
      return String(value);
    case 'address':
      if (typeof value === 'string' && value.length > 12) {
        return `${value.slice(0, 6)}…${value.slice(-4)}`;
      }
      return String(value);
    default:
      return String(value);
  }
}
