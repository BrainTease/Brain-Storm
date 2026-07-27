/**
 * Number utility functions
 */

export class NumberUtils {
  /**
   * Round number to decimal places
   */
  static round(num: number, decimals: number = 0): number {
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Floor number to decimal places
   */
  static floor(num: number, decimals: number = 0): number {
    return Math.floor(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Ceil number to decimal places
   */
  static ceil(num: number, decimals: number = 0): number {
    return Math.ceil(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
  }

  /**
   * Format number with thousand separators
   */
  static format(num: number, decimals: number = 0): string {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  /**
   * Format number as currency
   */
  static formatCurrency(num: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(num);
  }

  /**
   * Format number as percentage
   */
  static formatPercentage(num: number, decimals: number = 0): string {
    return `${this.round(num, decimals)}%`;
  }

  /**
   * Clamp number between min and max
   */
  static clamp(num: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, num));
  }

  /**
   * Check if number is even
   */
  static isEven(num: number): boolean {
    return num % 2 === 0;
  }

  /**
   * Check if number is odd
   */
  static isOdd(num: number): boolean {
    return num % 2 !== 0;
  }

  /**
   * Check if number is prime
   */
  static isPrime(num: number): boolean {
    if (num <= 1) return false;
    if (num <= 3) return true;
    if (num % 2 === 0 || num % 3 === 0) return false;
    for (let i = 5; i * i <= num; i += 6) {
      if (num % i === 0 || num % (i + 2) === 0) return false;
    }
    return true;
  }

  /**
   * Get absolute value
   */
  static abs(num: number): number {
    return Math.abs(num);
  }

  /**
   * Get minimum value
   */
  static min(...nums: number[]): number {
    return Math.min(...nums);
  }

  /**
   * Get maximum value
   */
  static max(...nums: number[]): number {
    return Math.max(...nums);
  }

  /**
   * Get average of numbers
   */
  static average(...nums: number[]): number {
    return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  /**
   * Get sum of numbers
   */
  static sum(...nums: number[]): number {
    return nums.reduce((a, b) => a + b, 0);
  }

  /**
   * Get percentage of number
   */
  static percentage(num: number, percent: number): number {
    return (num * percent) / 100;
  }

  /**
   * Get percentage increase
   */
  static percentageIncrease(oldValue: number, newValue: number): number {
    return ((newValue - oldValue) / oldValue) * 100;
  }

  /**
   * Get percentage decrease
   */
  static percentageDecrease(oldValue: number, newValue: number): number {
    return ((oldValue - newValue) / oldValue) * 100;
  }

  /**
   * Convert to fixed decimal
   */
  static toFixed(num: number, decimals: number = 0): string {
    return num.toFixed(decimals);
  }

  /**
   * Convert to exponential notation
   */
  static toExponential(num: number, decimals: number = 0): string {
    return num.toExponential(decimals);
  }

  /**
   * Check if number is integer
   */
  static isInteger(num: number): boolean {
    return Number.isInteger(num);
  }

  /**
   * Check if number is finite
   */
  static isFinite(num: number): boolean {
    return Number.isFinite(num);
  }

  /**
   * Check if number is NaN
   */
  static isNaN(num: number): boolean {
    return Number.isNaN(num);
  }

  /**
   * Parse integer
   */
  static parseInt(str: string, radix: number = 10): number {
    return parseInt(str, radix);
  }

  /**
   * Parse float
   */
  static parseFloat(str: string): number {
    return parseFloat(str);
  }

  /**
   * Generate random number between min and max
   */
  static random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random float between min and max
   */
  static randomFloat(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  /**
   * Convert bytes to human readable format
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
