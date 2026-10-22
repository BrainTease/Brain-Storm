import { describe, it, expect } from 'vitest';

import { formatDuration, formatShortNumber } from '@/lib/format';

describe('formatDuration', () => {
  it('formats zero as 0:00', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('treats null and undefined as zero', () => {
    expect(formatDuration(null)).toBe('0:00');
    expect(formatDuration(undefined)).toBe('0:00');
  });

  it('clamps negative and non-finite input to zero', () => {
    expect(formatDuration(-5)).toBe('0:00');
    expect(formatDuration(Number.NaN)).toBe('0:00');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0:00');
  });

  it('pads seconds and floors fractional values', () => {
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(75.9)).toBe('1:15');
  });

  it('keeps minutes unbounded for long durations', () => {
    expect(formatDuration(3723)).toBe('62:03');
  });
});

describe('formatShortNumber', () => {
  it('returns whole numbers unchanged below 1,000', () => {
    expect(formatShortNumber(0)).toBe('0');
    expect(formatShortNumber(999)).toBe('999');
  });

  it('keeps two decimals for fractional values below 1,000', () => {
    expect(formatShortNumber(12.5)).toBe('12.50');
  });

  it('abbreviates thousands and millions', () => {
    expect(formatShortNumber(1_000)).toBe('1.0k');
    expect(formatShortNumber(1_234)).toBe('1.2k');
    expect(formatShortNumber(2_500_000)).toBe('2.5M');
  });
});
