/**
 * Shared date formatting utilities for consistent date/time presentation
 * Replaces ad-hoc toLocaleDateString calls across the application
 */

const DATE_OPTIONS_SHORT = {
  year: 'numeric' as const,
  month: 'short' as const,
  day: 'numeric' as const,
};

const DATE_OPTIONS_LONG = {
  year: 'numeric' as const,
  month: 'long' as const,
  day: 'numeric' as const,
};

const DATETIME_OPTIONS_FULL = {
  year: 'numeric' as const,
  month: 'short' as const,
  day: 'numeric' as const,
  hour: '2-digit' as const,
  minute: '2-digit' as const,
};

const MONTH_YEAR_OPTIONS = {
  month: 'short' as const,
  year: 'numeric' as const,
};

const MONTH_DAY_OPTIONS = {
  month: 'short' as const,
  day: 'numeric' as const,
};

/**
 * Convert various date input formats to a Date object
 */
export function toDate(d: Date | number | string): Date {
  return d instanceof Date ? d : new Date(d);
}

/**
 * Format date in short format: "Jan 1, 2024"
 */
export function formatDateShort(date: Date | number | string): string {
  return toDate(date).toLocaleDateString('en-US', DATE_OPTIONS_SHORT);
}

/**
 * Format date in long format: "January 1, 2024"
 */
export function formatDateLong(date: Date | number | string): string {
  return toDate(date).toLocaleDateString('en-US', DATE_OPTIONS_LONG);
}

/**
 * Format date and time: "Jan 1, 2024, 02:30 PM"
 */
export function formatDateTime(date: Date | number | string): string {
  return toDate(date).toLocaleDateString('en-US', DATETIME_OPTIONS_FULL);
}

/**
 * Format month and year: "Jan 2024"
 */
export function formatMonthYear(date: Date | number | string): string {
  return toDate(date).toLocaleDateString('en-US', MONTH_YEAR_OPTIONS);
}

/**
 * Format month and day: "Jan 1"
 */
export function formatMonthDay(date: Date | number | string): string {
  return toDate(date).toLocaleDateString('en-US', MONTH_DAY_OPTIONS);
}

/**
 * Format time remaining between two dates
 */
export function formatTimeRemaining(deadline: Date | number | string): string {
  const timeRemaining = toDate(deadline).getTime() - Date.now();

  if (timeRemaining <= 0) return 'Expired';

  const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

/**
 * Check if a date is expired (in the past)
 */
export function isDateExpired(date: Date | number | string): boolean {
  return toDate(date).getTime() < Date.now();
}
