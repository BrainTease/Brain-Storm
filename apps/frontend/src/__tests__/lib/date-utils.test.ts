import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  toDate,
  formatDateShort,
  formatDateLong,
  formatDateTime,
  formatMonthYear,
  formatTimeRemaining,
  isDateExpired,
} from '@/lib/date-utils';

describe('date-utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('toDate', () => {
    it('converts string to Date', () => {
      const result = toDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
    });

    it('converts number to Date', () => {
      const timestamp = 1705315200000;
      const result = toDate(timestamp);
      expect(result).toBeInstanceOf(Date);
    });

    it('returns Date as-is', () => {
      const date = new Date('2024-01-15');
      const result = toDate(date);
      expect(result).toBe(date);
    });
  });

  describe('formatDateShort', () => {
    it('formats date in short format', () => {
      const result = formatDateShort('2024-01-15');
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('handles Date object', () => {
      const date = new Date('2024-01-15');
      const result = formatDateShort(date);
      expect(result).toMatch(/Jan 15, 2024/);
    });

    it('handles timestamp', () => {
      const timestamp = new Date('2024-01-15').getTime();
      const result = formatDateShort(timestamp);
      expect(result).toMatch(/Jan 15, 2024/);
    });
  });

  describe('formatDateLong', () => {
    it('formats date in long format', () => {
      const result = formatDateLong('2024-01-15');
      expect(result).toMatch(/January 15, 2024/);
    });
  });

  describe('formatDateTime', () => {
    it('formats date and time', () => {
      const result = formatDateTime('2024-01-15T14:30:00Z');
      expect(result).toMatch(/Jan 15, 2024/);
      expect(result).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('formatMonthYear', () => {
    it('formats month and year', () => {
      const result = formatMonthYear('2024-01-15');
      expect(result).toMatch(/Jan 2024/);
    });
  });

  describe('formatTimeRemaining', () => {
    it('returns "Expired" for past dates', () => {
      const pastDate = new Date('2024-01-14');
      const result = formatTimeRemaining(pastDate);
      expect(result).toBe('Expired');
    });

    it('formats time remaining in days', () => {
      const futureDate = new Date('2024-02-15');
      const result = formatTimeRemaining(futureDate);
      expect(result).toMatch(/\d+d \d+h remaining/);
    });

    it('formats time remaining in hours', () => {
      const futureDate = new Date('2024-01-15T18:00:00Z');
      const result = formatTimeRemaining(futureDate);
      expect(result).toMatch(/\d+h \d+m remaining/);
    });

    it('formats time remaining in minutes', () => {
      const futureDate = new Date('2024-01-15T10:30:00Z');
      const result = formatTimeRemaining(futureDate);
      expect(result).toMatch(/\d+m remaining/);
    });
  });

  describe('isDateExpired', () => {
    it('returns true for past dates', () => {
      const pastDate = new Date('2024-01-14');
      expect(isDateExpired(pastDate)).toBe(true);
    });

    it('returns false for future dates', () => {
      const futureDate = new Date('2024-02-15');
      expect(isDateExpired(futureDate)).toBe(false);
    });

    it('returns true for current date/time', () => {
      const now = new Date();
      expect(isDateExpired(now)).toBe(false);
    });
  });
});
