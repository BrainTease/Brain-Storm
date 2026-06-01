import { StringUtils } from './string.utils';
import { ArrayUtils } from './array.utils';
import { DateUtils } from './date.utils';
import { ObjectUtils } from './object.utils';
import { NumberUtils } from './number.utils';

describe('StringUtils', () => {
  it('should capitalize string', () => {
    expect(StringUtils.capitalize('hello')).toBe('Hello');
  });

  it('should convert to slug', () => {
    expect(StringUtils.toSlug('Hello World')).toBe('hello-world');
  });

  it('should truncate string', () => {
    expect(StringUtils.truncate('Hello World', 8)).toBe('Hello...');
  });

  it('should strip HTML', () => {
    expect(StringUtils.stripHtml('<p>Hello</p>')).toBe('Hello');
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
