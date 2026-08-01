import { StringUtils } from './string.utils';
import { ArrayUtils } from './array.utils';
import { DateUtils } from './date.utils';
import { ObjectUtils } from './object.utils';
import { NumberUtils } from './number.utils';

describe('StringUtils', () => {
  it('should capitalize string', () => {
    expect(StringUtils.capitalize('hello')).toBe('Hello');
  });

  it('should return unchanged string when already capitalized', () => {
    expect(StringUtils.capitalize('Hello')).toBe('Hello');
  });

  it('should return empty string for empty input', () => {
    expect(StringUtils.capitalize('')).toBe('');
  });

  it('should convert to slug', () => {
    expect(StringUtils.toSlug('Hello World')).toBe('hello-world');
  });

  it('should strip leading and trailing hyphens from slug', () => {
    expect(StringUtils.toSlug('  Hello World  ')).toBe('hello-world');
  });

  it('should remove special characters from slug', () => {
    expect(StringUtils.toSlug('Hello! World?')).toBe('hello-world');
  });

  it('should truncate string', () => {
    expect(StringUtils.truncate('Hello World', 8)).toBe('Hello...');
  });

  it('should not truncate when string is within length', () => {
    expect(StringUtils.truncate('Hi', 10)).toBe('Hi');
  });

  it('should use custom suffix for truncation', () => {
    expect(StringUtils.truncate('Hello World', 7, '…')).toBe('Hello W…');
  });

  it('should strip HTML', () => {
    expect(StringUtils.stripHtml('<p>Hello</p>')).toBe('Hello');
  });

  it('should strip nested HTML tags', () => {
    expect(StringUtils.stripHtml('<div><b>Hello</b> <i>World</i></div>')).toBe('Hello World');
  });

  it('should return plain string unchanged by stripHtml', () => {
    expect(StringUtils.stripHtml('No tags here')).toBe('No tags here');
  });

  // escapeHtml
  describe('escapeHtml', () => {
    it('should escape ampersand', () => {
      expect(StringUtils.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape angle brackets', () => {
      expect(StringUtils.escapeHtml('<script>')).toBe('&lt;script&gt;');
    });

    it('should escape double quotes', () => {
      expect(StringUtils.escapeHtml('Say "hi"')).toBe('Say &quot;hi&quot;');
    });

    it('should escape single quotes', () => {
      expect(StringUtils.escapeHtml("It's here")).toBe('It&#039;s here');
    });

    it('should return unchanged string with no special chars', () => {
      expect(StringUtils.escapeHtml('hello world')).toBe('hello world');
    });

    it('should handle empty string', () => {
      expect(StringUtils.escapeHtml('')).toBe('');
    });
  });

  // toCamelCase / toSnakeCase
  describe('toCamelCase', () => {
    it('should convert snake_case to camelCase', () => {
      expect(StringUtils.toCamelCase('hello_world')).toBe('helloWorld');
    });

    it('should handle multiple underscores', () => {
      expect(StringUtils.toCamelCase('first_name_last')).toBe('firstNameLast');
    });

    it('should return unchanged string without underscores', () => {
      expect(StringUtils.toCamelCase('hello')).toBe('hello');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(StringUtils.toSnakeCase('helloWorld')).toBe('hello_world');
    });

    it('should handle multiple consecutive capitals', () => {
      expect(StringUtils.toSnakeCase('firstName')).toBe('first_name');
    });

    it('should return unchanged lowercase string', () => {
      expect(StringUtils.toSnakeCase('hello')).toBe('hello');
    });
  });

  // countOccurrences
  describe('countOccurrences', () => {
    it('should count occurrences of substring', () => {
      expect(StringUtils.countOccurrences('abcabcabc', 'abc')).toBe(3);
    });

    it('should return 0 when substring not present', () => {
      expect(StringUtils.countOccurrences('hello', 'xyz')).toBe(0);
    });

    it('should count single characters', () => {
      expect(StringUtils.countOccurrences('aababc', 'a')).toBe(3);
    });

    it('should handle empty substring (returns length + 1 per JS split behavior)', () => {
      // str.split('').length - 1 = str.length
      expect(StringUtils.countOccurrences('abc', '')).toBe(3);
    });
  });

  // isEmpty
  describe('isEmpty', () => {
    it('should return true for empty string', () => {
      expect(StringUtils.isEmpty('')).toBe(true);
    });

    it('should return true for whitespace-only string', () => {
      expect(StringUtils.isEmpty('   ')).toBe(true);
    });

    it('should return false for non-empty string', () => {
      expect(StringUtils.isEmpty('hello')).toBe(false);
    });

    it('should return true for null/undefined-like falsy', () => {
      expect(StringUtils.isEmpty(null as any)).toBe(true);
    });
  });

  // replaceAll
  describe('replaceAll', () => {
    it('should replace all occurrences', () => {
      expect(StringUtils.replaceAll('aabbaa', 'aa', 'xx')).toBe('xxbbxx');
    });

    it('should replace all single characters', () => {
      expect(StringUtils.replaceAll('hello world', 'o', '0')).toBe('hell0 w0rld');
    });

    it('should return unchanged string if search not found', () => {
      expect(StringUtils.replaceAll('hello', 'z', 'y')).toBe('hello');
    });
  });

  // random
  describe('random', () => {
    it('should return string of specified length', () => {
      const result = StringUtils.random(12);
      expect(result).toHaveLength(12);
    });

    it('should default to length 10', () => {
      expect(StringUtils.random()).toHaveLength(10);
    });

    it('should only contain alphanumeric characters', () => {
      const result = StringUtils.random(100);
      expect(/^[A-Za-z0-9]+$/.test(result)).toBe(true);
    });

    it('should produce different values on repeated calls', () => {
      const a = StringUtils.random(20);
      const b = StringUtils.random(20);
      // Extremely unlikely to be equal
      expect(a).not.toBe(b);
    });
  });
});

describe('ArrayUtils', () => {
  it('should remove duplicates', () => {
    expect(ArrayUtils.unique([1, 2, 2, 3])).toEqual([1, 2, 3]);
  });

  it('should chunk array', () => {
    expect(ArrayUtils.chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should group by key', () => {
    const arr = [
      { type: 'a', value: 1 },
      { type: 'b', value: 2 },
      { type: 'a', value: 3 },
    ];
    const grouped = ArrayUtils.groupBy(arr, 'type');
    expect(grouped['a']).toHaveLength(2);
    expect(grouped['b']).toHaveLength(1);
  });

  it('should sum array', () => {
    expect(ArrayUtils.sum([1, 2, 3, 4])).toBe(10);
  });
});

describe('DateUtils', () => {
  it('should add days', () => {
    const date = new Date('2026-01-01');
    const result = DateUtils.addDays(date, 5);
    expect(result.getDate()).toBe(6);
  });

  it('should check if past', () => {
    const pastDate = new Date('2020-01-01');
    expect(DateUtils.isPast(pastDate)).toBe(true);
  });

  it('should get age', () => {
    const birthDate = new Date('2000-01-01');
    const age = DateUtils.getAge(birthDate);
    expect(age).toBeGreaterThan(20);
  });
});

describe('ObjectUtils', () => {
  it('should deep clone object', () => {
    const obj = { a: { b: 1 } };
    const cloned = ObjectUtils.deepClone(obj);
    cloned.a.b = 2;
    expect(obj.a.b).toBe(1);
  });

  it('should pick properties', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const picked = ObjectUtils.pick(obj, 'a', 'b');
    expect(picked).toEqual({ a: 1, b: 2 });
  });

  it('should get nested property', () => {
    const obj = { a: { b: { c: 1 } } };
    expect(ObjectUtils.get(obj, 'a.b.c')).toBe(1);
  });
});

describe('NumberUtils', () => {
  it('should round number', () => {
    expect(NumberUtils.round(1.234, 2)).toBe(1.23);
  });

  it('should format currency', () => {
    const formatted = NumberUtils.formatCurrency(1234.56);
    expect(formatted).toContain('1,234.56');
  });

  it('should clamp number', () => {
    expect(NumberUtils.clamp(5, 0, 10)).toBe(5);
    expect(NumberUtils.clamp(15, 0, 10)).toBe(10);
  });

  it('should check if even', () => {
    expect(NumberUtils.isEven(4)).toBe(true);
    expect(NumberUtils.isEven(5)).toBe(false);
  });
});
