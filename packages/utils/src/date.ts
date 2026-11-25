/**
 * Framework-agnostic date coercion shared by web and server utilities (#1543).
 * Accepts a Date, an epoch-millisecond number, or a parseable date string.
 */
export function toDate(d: Date | number | string): Date {
  return d instanceof Date ? d : new Date(d);
}
