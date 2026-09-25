/**
 * Test to verify centralized date/currency formatting utilities (Issue #1123)
 * Ensures formatting logic is consolidated and tested for locale/precision edge cases
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const getFormatPath = () => path.resolve(__dirname, '../lib/format.ts');
const getFormatContent = () => fs.readFileSync(getFormatPath(), 'utf-8');

describe('Centralized Formatting Utilities - Issue #1123', () => {
  it('should have centralized format.ts module', () => {
    expect(fs.existsSync(getFormatPath())).toBe(true);
  });

  it('should export useDateFormatter', () => {
    expect(getFormatContent()).toContain('useDateFormatter');
  });

  it('should export useNumberFormatter', () => {
    expect(getFormatContent()).toContain('useNumberFormatter');
  });

  it('should have date formatter methods', () => {
    const content = getFormatContent();
    expect(content).toContain('short:');
    expect(content).toContain('long:');
    expect(content).toContain('relative:');
  });

  it('should have number formatter methods', () => {
    const content = getFormatContent();
    expect(content).toContain('decimal:');
    expect(content).toContain('percent:');
    expect(content).toContain('compact:');
    expect(content).toContain('currency:');
  });

  it('should handle Date/number/string inputs', () => {
    expect(getFormatContent()).toContain('Date | number | string');
  });

  it('should use next-intl for localization', () => {
    const content = getFormatContent();
    expect(content).toContain('next-intl');
    expect(content).toContain('useFormatter');
    expect(content).toContain('useLocale');
  });

  it('should have compact number notation', () => {
    expect(getFormatContent()).toContain("notation: 'compact'");
  });

  it('should have currency parameter', () => {
    const content = getFormatContent();
    expect(content).toContain('currency =');
    expect(content).toContain("'currency'");
  });

  it('should have percent formatting', () => {
    const content = getFormatContent();
    expect(content).toContain('maximumFractionDigits: 0');
    expect(content).toContain("'percent'");
  });

  it('should have toDate helper', () => {
    expect(getFormatContent()).toContain('toDate');
  });
});
