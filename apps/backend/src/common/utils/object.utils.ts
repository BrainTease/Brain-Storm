/**
 * Object utility functions
 */

export class ObjectUtils {
  /**
   * Deep clone object
   */
  static deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item)) as any;
    if (obj instanceof Object) {
      const clonedObj = {} as T;
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * Merge objects
   */
  static merge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T {
    if (!sources.length) return target;
    const source = sources.shift();
    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.merge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
    return this.merge(target, ...sources);
  }

  /**
   * Pick properties from object
   */
  static pick<T extends Record<string, any>, K extends keyof T>(obj: T, ...keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    keys.forEach((key) => {
      if (key in obj) {
        result[key] = obj[key];
      }
    });
    return result;
  }

  /**
   * Omit properties from object
   */
  static omit<T extends Record<string, any>, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach((key) => {
      delete result[key];
    });
    return result;
  }

  /**
   * Get nested property value
   */
  static get<T = any>(obj: Record<string, any>, path: string, defaultValue?: T): T {
    const keys = path.split('.');
    let result: any = obj;
    for (const key of keys) {
      result = result?.[key];
      if (result === undefined) return defaultValue as T;
    }
    return result as T;
  }

  /**
   * Set nested property value
   */
  static set<T extends Record<string, any>>(obj: T, path: string, value: any): T {
    const keys = path.split('.');
    let current: any = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
  }

  /**
   * Check if object is empty
   */
  static isEmpty(obj: Record<string, any>): boolean {
    return Object.keys(obj).length === 0;
  }

  /**
   * Check if object has property
   */
  static hasProperty<T extends Record<string, any>>(obj: T, key: keyof T): boolean {
    return key in obj;
  }

  /**
   * Get object keys
   */
  static keys<T extends Record<string, any>>(obj: T): (keyof T)[] {
    return Object.keys(obj) as (keyof T)[];
  }

  /**
   * Get object values
   */
  static values<T extends Record<string, any>>(obj: T): T[keyof T][] {
    return Object.values(obj);
  }

  /**
   * Get object entries
   */
  static entries<T extends Record<string, any>>(obj: T): [keyof T, T[keyof T]][] {
    return Object.entries(obj) as [keyof T, T[keyof T]][];
  }

  /**
   * Map object values
   */
  static mapValues<T extends Record<string, any>, R>(obj: T, fn: (value: T[keyof T], key: keyof T) => R): Record<keyof T, R> {
    const result = {} as Record<keyof T, R>;
    for (const key in obj) {
      result[key as keyof T] = fn(obj[key], key as keyof T);
    }
    return result;
  }

  /**
   * Filter object by predicate
   */
  static filter<T extends Record<string, any>>(obj: T, predicate: (value: T[keyof T], key: keyof T) => boolean): Partial<T> {
    const result = {} as Partial<T>;
    for (const key in obj) {
      if (predicate(obj[key], key as keyof T)) {
        result[key as keyof T] = obj[key];
      }
    }
    return result;
  }

  /**
   * Check if object is plain object
   */
  static isObject(obj: any): obj is Record<string, any> {
    return obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof Array);
  }

  /**
   * Convert object to query string
   */
  static toQueryString(obj: Record<string, any>): string {
    return Object.entries(obj)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');
  }

  /**
   * Parse query string to object
   */
  static fromQueryString(queryString: string): Record<string, string> {
    const result: Record<string, string> = {};
    queryString.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      result[decodeURIComponent(key)] = decodeURIComponent(value || '');
    });
    return result;
  }

  /**
   * Flatten nested object
   */
  static flatten(obj: Record<string, any>, prefix = ''): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in obj) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (this.isObject(value)) {
        Object.assign(result, this.flatten(value, newKey));
      } else {
        result[newKey] = value;
      }
    }
    return result;
  }

  /**
   * Unflatten object
   */
  static unflatten(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in obj) {
      this.set(result, key, obj[key]);
    }
    return result;
  }

  /**
   * Check if objects are equal
   */
  static equals(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    if (obj1 == null || obj2 == null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) return false;

    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.equals(obj1[key], obj2[key])) return false;
    }

    return true;
  }
}
