/**
 * String utility functions
 */

export class StringUtils {
  /**
   * Capitalize first letter of string
   */
  static capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Convert string to slug format
   */
  static toSlug(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Truncate string to specified length
   */
  static truncate(str: string, length: number, suffix = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }

  /**
   * Remove HTML tags from string
   */
  static stripHtml(str: string): string {
    return str.replace(/<[^>]*>/g, '');
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(str: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return str.replace(/[&<>"']/g, (char) => map[char]);
  }

  /**
   * Check if string is empty or whitespace
   */
  static isEmpty(str: string): boolean {
    return !str || str.trim().length === 0;
  }

  /**
   * Pad string to specified length
   */
  static padStart(str: string, length: number, padChar = ' '): string {
    return str.padStart(length, padChar);
  }

  /**
   * Repeat string n times
   */
  static repeat(str: string, count: number): string {
    return str.repeat(count);
  }

  /**
   * Generate random string
   */
  static random(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Convert camelCase to snake_case
   */
  static toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert snake_case to camelCase
   */
  static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Check if string matches pattern
   */
  static matches(str: string, pattern: RegExp | string): boolean {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return regex.test(str);
  }

  /**
   * Count occurrences of substring
   */
  static countOccurrences(str: string, substring: string): number {
    return str.split(substring).length - 1;
  }

  /**
   * Replace all occurrences
   */
  static replaceAll(str: string, search: string, replace: string): string {
    return str.split(search).join(replace);
  }
}
