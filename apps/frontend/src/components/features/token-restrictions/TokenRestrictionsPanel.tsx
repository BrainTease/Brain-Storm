'use client';

/**
 * TokenRestrictionsPanel — issue #966
 *
 * ⚠️  WARNING: Do NOT add per-restriction-type conditionals here.
 * All rendering is driven by the RESTRICTION_RULES schema in ./schema.ts.
 * To add a new restriction type, edit schema.ts only.
 */

import React from 'react';
import { RESTRICTION_RULES, findRule, formatValue, type RestrictionRule } from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A map of restriction key → raw value as returned by the contracts layer. */
export type TokenRestrictions = Record<string, unknown>;

interface TokenRestrictionsPanelProps {
  restrictions: TokenRestrictions;
  /** Optional CSS override for the root container. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function TokenRestrictionsPanel({
  restrictions,
  className = '',
}: TokenRestrictionsPanelProps) {
  // Merge active restrictions with schema order so known rules always appear
  // at the top, unknown keys fall through at the bottom.
  const knownRows: Array<{ rule: RestrictionRule; value: unknown }> = RESTRICTION_RULES.filter(
    (r) => Object.prototype.hasOwnProperty.call(restrictions, r.key),
  ).map((rule) => ({ rule, value: restrictions[rule.key] }));

  const unknownRows = Object.entries(restrictions)
    .filter(([key]) => !findRule(key))
    .map(([key, value]) => ({ key, value }));

  if (knownRows.length === 0 && unknownRows.length === 0) {
    return (
      <div
        className={`rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}
        data-testid="token-restrictions-panel"
      >
        <p className="text-sm text-gray-500 dark:text-gray-400">No restrictions configured.</p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 ${className}`}
      data-testid="token-restrictions-panel"
      aria-label="Token restrictions"
    >
      {knownRows.map(({ rule, value }) => (
        <RestrictionRow key={rule.key} rule={rule} value={value} />
      ))}

      {unknownRows.map(({ key, value }) => (
        <UnknownRestrictionRow key={key} restrictionKey={key} value={value} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row components
// ---------------------------------------------------------------------------

interface RestrictionRowProps {
  rule: RestrictionRule;
  value: unknown;
}

function RestrictionRow({ rule, value }: RestrictionRowProps) {
  const formatted = formatValue(value, rule.valueType);
  const badgeClass =
    rule.badgeClass ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

  return (
    <div
      className="flex items-start justify-between gap-4 px-5 py-4"
      data-testid={`restriction-row-${rule.key}`}
      role="row"
    >
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{rule.label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rule.description}</p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}
        data-testid={`restriction-value-${rule.key}`}
      >
        {formatted}
      </span>
    </div>
  );
}

interface UnknownRestrictionRowProps {
  restrictionKey: string;
  value: unknown;
}

function UnknownRestrictionRow({ restrictionKey, value }: UnknownRestrictionRowProps) {
  return (
    <div
      className="flex items-start justify-between gap-4 px-5 py-4"
      data-testid={`restriction-row-unknown-${restrictionKey}`}
      role="row"
    >
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 font-mono">
          {restrictionKey}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Unknown restriction</p>
      </div>
      <span className="inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {String(value)}
      </span>
    </div>
  );
}
