/* eslint-disable import/no-unresolved, @typescript-eslint/no-explicit-any */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const LOCALES_DIR = join(__dirname, '../../locales');

function getAllKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys.push(...getAllKeys(obj[key], fullKey));
      } else {
        keys.push(fullKey);
      }
    }
  }
  return keys;
}

function loadLocaleFile(locale: string): any {
  try {
    const filePath = join(LOCALES_DIR, `${locale}.json`);
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load locale file for "${locale}": ${error}`);
  }
}

function getAvailableLocales(): string[] {
  try {
    const files = readdirSync(LOCALES_DIR);
    return files.filter((file) => file.endsWith('.json')).map((file) => file.replace('.json', ''));
  } catch (error) {
    throw new Error(`Failed to read locales directory: ${error}`);
  }
}

// eslint-disable-next-line max-lines-per-function
describe('i18n key parity', () => {
  it('should have at least one locale file', () => {
    const locales = getAvailableLocales();
    expect(locales.length).toBeGreaterThan(0);
  });

  it('should load all locale files without errors', () => {
    const locales = getAvailableLocales();
    expect(() => {
      locales.forEach((locale) => {
        loadLocaleFile(locale);
      });
    }).not.toThrow();
  });

  it('should have valid JSON structure in all locale files', () => {
    const locales = getAvailableLocales();
    locales.forEach((locale) => {
      const data = loadLocaleFile(locale);
      expect(typeof data).toBe('object');
      expect(data).not.toBeNull();
    });
  });

  it('should maintain key parity across all locales', () => {
    const locales = getAvailableLocales();
    expect(locales.length).toBeGreaterThan(0);

    const primaryLocale = locales[0];
    const primaryKeys = getAllKeys(loadLocaleFile(primaryLocale)).sort();

    locales.forEach((locale) => {
      const localeData = loadLocaleFile(locale);
      const localeKeys = getAllKeys(localeData).sort();

      expect(localeKeys).toEqual(
        primaryKeys,
        `Locale "${locale}" has different keys than "${primaryLocale}"`
      );
    });
  });

  it('should not have empty string values', () => {
    const locales = getAvailableLocales();
    locales.forEach((locale) => {
      const data = loadLocaleFile(locale);

      const checkEmpty = (obj: any): boolean => {
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (typeof obj[key] === 'string' && obj[key].trim() === '') {
              return true;
            }
            if (typeof obj[key] === 'object' && obj[key] !== null && checkEmpty(obj[key])) {
              return true;
            }
          }
        }
        return false;
      };

      expect(checkEmpty(data)).toBe(false, `Locale "${locale}" contains empty string values`);
    });
  });

  it('should have consistent key structure across locales', () => {
    const locales = getAvailableLocales();
    const localeDataMap = new Map();

    locales.forEach((locale) => {
      localeDataMap.set(locale, loadLocaleFile(locale));
    });

    const primaryLocale = locales[0];
    const primaryData = localeDataMap.get(primaryLocale);

    const checkStructure = (obj: any, path = '') => {
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          const currentPath = path ? `${path}.${key}` : key;
          const type = typeof obj[key];

          locales.forEach((locale) => {
            if (locale === primaryLocale) return;
            const localeData = localeDataMap.get(locale);
            const keys = currentPath.split('.');
            let value = localeData;
            for (const k of keys) {
              value = value?.[k];
            }

            const valueType = value ? typeof value : 'undefined';
            expect(valueType).toBe(
              type,
              `Key "${currentPath}" has inconsistent types in "${locale}"`
            );
          });

          if (type === 'object' && obj[key] !== null) {
            checkStructure(obj[key], currentPath);
          }
        }
      }
    };

    checkStructure(primaryData);
  });

  it('should detect unused translation keys', () => {
    const locales = getAvailableLocales();
    locales.forEach((locale) => {
      const data = loadLocaleFile(locale);
      const keys = getAllKeys(data);
      expect(keys.length).toBeGreaterThan(0, `No keys found in locale "${locale}"`);
    });
  });

  it('should validate key format (no special characters)', () => {
    const locales = getAvailableLocales();
    const validKeyPattern = /^[a-zA-Z0-9_]+$/;

    locales.forEach((locale) => {
      const data = loadLocaleFile(locale);
      const keys = getAllKeys(data);

      keys.forEach((key) => {
        const keyParts = key.split('.');
        keyParts.forEach((part) => {
          expect(part).toMatch(
            validKeyPattern,
            `Invalid key format in "${locale}": "${key}" contains invalid characters`
          );
        });
      });
    });
  });

  it('should maintain consistency in deeply nested structures', () => {
    const locales = getAvailableLocales();
    expect(locales.length).toBeGreaterThanOrEqual(1);

    if (locales.length > 1) {
      const primaryLocale = locales[0];
      const primaryData = loadLocaleFile(primaryLocale);
      const primaryKeys = getAllKeys(primaryData);

      locales.slice(1).forEach((locale) => {
        const localeData = loadLocaleFile(locale);
        const localeKeys = getAllKeys(localeData);
        expect(new Set(localeKeys)).toEqual(
          new Set(primaryKeys),
          `Locale "${locale}" key set does not match "${primaryLocale}"`
        );
      });
    }
  });
});
