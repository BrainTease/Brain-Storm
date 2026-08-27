/**
 * Unit tests for TokenRestrictionsPanel schema-driven rendering — issue #966
 *
 * Acceptance criteria:
 *   - Adding a new restriction type requires no UI code change (schema-only)
 *   - Schema-driven rendering is unit tested
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenRestrictionsPanel } from '@/components/features/token-restrictions/TokenRestrictionsPanel';
import {
  RESTRICTION_RULES,
  findRule,
  formatValue,
  type RestrictionRule,
} from '@/components/features/token-restrictions/schema';

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------
describe('schema helpers', () => {
  it('findRule returns the correct descriptor for a known key', () => {
    const rule = findRule('transfer_locked');
    expect(rule).toBeDefined();
    expect(rule?.label).toBe('Transfer Lock');
  });

  it('findRule returns undefined for an unknown key', () => {
    expect(findRule('does_not_exist')).toBeUndefined();
  });

  describe('formatValue', () => {
    it('formats boolean true as "Enabled"', () => {
      expect(formatValue(true, 'boolean')).toBe('Enabled');
    });
    it('formats boolean false as "Disabled"', () => {
      expect(formatValue(false, 'boolean')).toBe('Disabled');
    });
    it('formats amount with token suffix', () => {
      expect(formatValue(5000, 'amount')).toContain('tokens');
    });
    it('formats percentage with % suffix', () => {
      expect(formatValue(2.5, 'percentage')).toBe('2.5%');
    });
    it('formats duration in days when >= 86400s', () => {
      expect(formatValue(86400, 'duration')).toBe('1 day');
    });
    it('formats duration in hours when < 86400s', () => {
      expect(formatValue(7200, 'duration')).toBe('2 hours');
    });
    it('formats duration in seconds as fallback', () => {
      expect(formatValue(45, 'duration')).toBe('45s');
    });
    it('truncates long address values', () => {
      const addr = 'GABC1234567890XYZ';
      const result = formatValue(addr, 'address');
      expect(result).toContain('…');
      expect(result.length).toBeLessThan(addr.length);
    });
  });
});

// ---------------------------------------------------------------------------
// Panel rendering
// ---------------------------------------------------------------------------
describe('TokenRestrictionsPanel', () => {
  it('renders "No restrictions configured" when given an empty map', () => {
    render(<TokenRestrictionsPanel restrictions={{}} />);
    expect(screen.getByText(/no restrictions configured/i)).toBeInTheDocument();
  });

  it('renders a row for each known restriction key in restrictions prop', () => {
    const restrictions = { transfer_locked: true, burn_rate: 3 };
    render(<TokenRestrictionsPanel restrictions={restrictions} />);

    expect(screen.getByTestId('restriction-row-transfer_locked')).toBeInTheDocument();
    expect(screen.getByTestId('restriction-row-burn_rate')).toBeInTheDocument();
  });

  it('does NOT render rows for restriction keys absent from the prop', () => {
    const restrictions = { transfer_locked: true };
    render(<TokenRestrictionsPanel restrictions={restrictions} />);

    expect(screen.queryByTestId('restriction-row-burn_rate')).not.toBeInTheDocument();
  });

  it('renders the schema label and description for each row', () => {
    const rule = findRule('max_balance')!;
    render(<TokenRestrictionsPanel restrictions={{ max_balance: 10000 }} />);

    expect(screen.getByText(rule.label)).toBeInTheDocument();
    expect(screen.getByText(rule.description)).toBeInTheDocument();
  });

  it('renders formatted value using the schema valueType', () => {
    render(<TokenRestrictionsPanel restrictions={{ burn_rate: 5 }} />);
    expect(screen.getByTestId('restriction-value-burn_rate')).toHaveTextContent('5%');
  });

  it('renders unknown restriction keys without crashing', () => {
    render(<TokenRestrictionsPanel restrictions={{ some_future_key: 'xyz' }} />);
    expect(screen.getByTestId('restriction-row-unknown-some_future_key')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Schema extensibility — simulate adding a new rule at runtime
  // ---------------------------------------------------------------------------
  it('renders a new restriction type when its rule is added to the schema', () => {
    // Simulate what happens when a developer adds a new entry to RESTRICTION_RULES
    const newRule: RestrictionRule = {
      key: 'cooldown_period',
      label: 'Cooldown Period',
      description: 'Delay between consecutive transfers.',
      valueType: 'duration',
    };

    // Temporarily push to the live registry
    RESTRICTION_RULES.push(newRule);

    render(<TokenRestrictionsPanel restrictions={{ cooldown_period: 3600 }} />);

    expect(screen.getByTestId('restriction-row-cooldown_period')).toBeInTheDocument();
    expect(screen.getByText('Cooldown Period')).toBeInTheDocument();
    // 3600s = 1 hour
    expect(screen.getByTestId('restriction-value-cooldown_period')).toHaveTextContent('1 hour');

    // Cleanup: remove the rule we pushed
    const idx = RESTRICTION_RULES.indexOf(newRule);
    if (idx !== -1) RESTRICTION_RULES.splice(idx, 1);
  });

  it('renders all RESTRICTION_RULES keys when all are present', () => {
    const allRestrictions = Object.fromEntries(
      RESTRICTION_RULES.map((r) => [
        r.key,
        r.valueType === 'boolean' ? true : r.valueType === 'amount' ? 1000 : 5,
      ]),
    );
    render(<TokenRestrictionsPanel restrictions={allRestrictions} />);

    for (const rule of RESTRICTION_RULES) {
      expect(screen.getByTestId(`restriction-row-${rule.key}`)).toBeInTheDocument();
    }
  });
});
