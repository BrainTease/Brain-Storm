/**
 * Array utility functions
 */

export class ArrayUtils {
  /**
   * Remove duplicates from array
   */
  static unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  /**
   * Remove duplicates by property
   */
  static uniqueBy<T>(arr: T[], key: keyof T): T[] {
    const seen = new Set();
    return arr.filter((item) => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  /**
   * Flatten nested array
   */
  static flatten<T>(arr: (T | T[])[]): T[] {
    return arr.reduce((acc, val) => acc.concat(val), [] as T[]);
  }

  /**
   * Flatten deeply nested array
   */
  static flattenDeep<T>(arr: any[]): T[] {
    return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? this.flattenDeep(val) : val), [] as T[]);
  }

  /**
   * Chunk array into smaller arrays
   */
  static chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Group array by key
   */
  static groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
    return arr.reduce(
      (acc, item) => {
        const groupKey = String(item[key]);
        if (!acc[groupKey]) acc[groupKey] = [];
        acc[groupKey].push(item);
        return acc;
      },
      {} as Record<string, T[]>,
    );
  }

  /**
   * Sort array by property
   */
  static sortBy<T>(arr: T[], key: keyof T, order: 'asc' | 'desc' = 'asc'): T[] {
    return [...arr].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return order === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * Find index of item
   */
  static findIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
    return arr.findIndex(predicate);
  }

  /**
   * Remove item from array
   */
  static remove<T>(arr: T[], item: T): T[] {
    return arr.filter((x) => x !== item);
  }

  /**
   * Remove items matching predicate
   */
  static removeWhere<T>(arr: T[], predicate: (item: T) => boolean): T[] {
    return arr.filter((item) => !predicate(item));
  }

  /**
   * Insert item at index
   */
  static insert<T>(arr: T[], index: number, item: T): T[] {
    const newArr = [...arr];
    newArr.splice(index, 0, item);
    return newArr;
  }

  /**
   * Replace item at index
   */
  static replace<T>(arr: T[], index: number, item: T): T[] {
    const newArr = [...arr];
    newArr[index] = item;
    return newArr;
  }

  /**
   * Shuffle array
   */
  static shuffle<T>(arr: T[]): T[] {
    const newArr = [...arr];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  /**
   * Get random item from array
   */
  static random<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Get first n items
   */
  static take<T>(arr: T[], n: number): T[] {
    return arr.slice(0, n);
  }

  /**
   * Get last n items
   */
  static takeLast<T>(arr: T[], n: number): T[] {
    return arr.slice(-n);
  }

  /**
   * Skip first n items
   */
  static skip<T>(arr: T[], n: number): T[] {
    return arr.slice(n);
  }

  /**
   * Check if array contains item
   */
  static contains<T>(arr: T[], item: T): boolean {
    return arr.includes(item);
  }

  /**
   * Check if arrays are equal
   */
  static equals<T>(arr1: T[], arr2: T[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => item === arr2[index]);
  }

  /**
   * Get intersection of arrays
   */
  static intersection<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter((item) => arr2.includes(item));
  }

  /**
   * Get difference of arrays
   */
  static difference<T>(arr1: T[], arr2: T[]): T[] {
    return arr1.filter((item) => !arr2.includes(item));
  }

  /**
   * Get union of arrays
   */
  static union<T>(arr1: T[], arr2: T[]): T[] {
    return this.unique([...arr1, ...arr2]);
  }

  /**
   * Zip arrays together
   */
  static zip<T>(...arrays: T[][]): T[][] {
    const maxLength = Math.max(...arrays.map((arr) => arr.length));
    return Array.from({ length: maxLength }, (_, i) => arrays.map((arr) => arr[i]));
  }

  /**
   * Sum array of numbers
   */
  static sum(arr: number[]): number {
    return arr.reduce((acc, val) => acc + val, 0);
  }

  /**
   * Average of array
   */
  static average(arr: number[]): number {
    return arr.length === 0 ? 0 : this.sum(arr) / arr.length;
  }

  /**
   * Min value in array
   */
  static min(arr: number[]): number {
    return Math.min(...arr);
  }

  /**
   * Max value in array
   */
  static max(arr: number[]): number {
    return Math.max(...arr);
  }
}
