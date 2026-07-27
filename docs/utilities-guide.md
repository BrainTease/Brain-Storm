# Utility Functions Guide

This guide explains the common utility functions available in Brain-Storm backend.

## Overview

The utility module provides reusable functions for:
- String manipulation
- Array operations
- Date handling
- Object manipulation
- Number formatting

## String Utilities

```typescript
import { StringUtils } from '@common/utils';

// Capitalize
StringUtils.capitalize('hello'); // 'Hello'

// Convert to slug
StringUtils.toSlug('Hello World'); // 'hello-world'

// Truncate
StringUtils.truncate('Hello World', 8); // 'Hello...'

// Strip HTML
StringUtils.stripHtml('<p>Hello</p>'); // 'Hello'

// Escape HTML
StringUtils.escapeHtml('<script>alert("xss")</script>');

// Check if empty
StringUtils.isEmpty('  '); // true

// Convert case
StringUtils.toSnakeCase('helloWorld'); // 'hello_world'
StringUtils.toCamelCase('hello_world'); // 'helloWorld'

// String matching
StringUtils.matches('test@example.com', /^[^\s@]+@[^\s@]+\.[^\s@]+$/); // true

// Count occurrences
StringUtils.countOccurrences('hello hello', 'hello'); // 2

// Replace all
StringUtils.replaceAll('hello world', 'l', 'L'); // 'heLLo worLd'
```

## Array Utilities

```typescript
import { ArrayUtils } from '@common/utils';

// Remove duplicates
ArrayUtils.unique([1, 2, 2, 3]); // [1, 2, 3]

// Remove duplicates by property
ArrayUtils.uniqueBy(users, 'email');

// Flatten array
ArrayUtils.flatten([[1, 2], [3, 4]]); // [1, 2, 3, 4]

// Chunk array
ArrayUtils.chunk([1, 2, 3, 4, 5], 2); // [[1, 2], [3, 4], [5]]

// Group by key
ArrayUtils.groupBy(users, 'role');

// Sort by property
ArrayUtils.sortBy(users, 'name', 'asc');

// Remove item
ArrayUtils.remove([1, 2, 3], 2); // [1, 3]

// Insert at index
ArrayUtils.insert([1, 2, 3], 1, 1.5); // [1, 1.5, 2, 3]

// Shuffle
ArrayUtils.shuffle([1, 2, 3, 4, 5]);

// Get random item
ArrayUtils.random([1, 2, 3, 4, 5]);

// Take first n
ArrayUtils.take([1, 2, 3, 4, 5], 3); // [1, 2, 3]

// Skip first n
ArrayUtils.skip([1, 2, 3, 4, 5], 2); // [3, 4, 5]

// Array operations
ArrayUtils.intersection([1, 2, 3], [2, 3, 4]); // [2, 3]
ArrayUtils.difference([1, 2, 3], [2, 3, 4]); // [1]
ArrayUtils.union([1, 2], [2, 3]); // [1, 2, 3]

// Math operations
ArrayUtils.sum([1, 2, 3, 4]); // 10
ArrayUtils.average([1, 2, 3, 4]); // 2.5
ArrayUtils.min([1, 2, 3, 4]); // 1
ArrayUtils.max([1, 2, 3, 4]); // 4
```

## Date Utilities

```typescript
import { DateUtils } from '@common/utils';

// Format date
DateUtils.format(new Date(), 'YYYY-MM-DD'); // '2026-06-01'

// Add time
DateUtils.addDays(new Date(), 5);
DateUtils.addHours(new Date(), 2);
DateUtils.addMinutes(new Date(), 30);

// Get difference
DateUtils.diffInDays(date1, date2);
DateUtils.diffInHours(date1, date2);
DateUtils.diffInMinutes(date1, date2);

// Check date
DateUtils.isPast(date);
DateUtils.isFuture(date);
DateUtils.isToday(date);

// Get boundaries
DateUtils.startOfDay(date);
DateUtils.endOfDay(date);
DateUtils.startOfMonth(date);
DateUtils.endOfMonth(date);
DateUtils.startOfYear(date);
DateUtils.endOfYear(date);

// Parse and validate
DateUtils.isValid(date);
DateUtils.parse('2026-06-01');

// Get info
DateUtils.getAge(birthDate);
DateUtils.getDayOfWeek(date);
DateUtils.getWeekNumber(date);
DateUtils.isLeapYear(2026);
DateUtils.getDaysInMonth(date);
```

## Object Utilities

```typescript
import { ObjectUtils } from '@common/utils';

// Clone
ObjectUtils.deepClone(obj);

// Merge
ObjectUtils.merge(target, source1, source2);

// Pick/Omit
ObjectUtils.pick(obj, 'a', 'b'); // { a: 1, b: 2 }
ObjectUtils.omit(obj, 'c'); // { a: 1, b: 2 }

// Get/Set nested properties
ObjectUtils.get(obj, 'a.b.c');
ObjectUtils.set(obj, 'a.b.c', value);

// Check properties
ObjectUtils.isEmpty(obj);
ObjectUtils.hasProperty(obj, 'key');

// Get keys/values/entries
ObjectUtils.keys(obj);
ObjectUtils.values(obj);
ObjectUtils.entries(obj);

// Map/Filter
ObjectUtils.mapValues(obj, (value) => value * 2);
ObjectUtils.filter(obj, (value) => value > 10);

// Query string
ObjectUtils.toQueryString({ a: 1, b: 2 }); // 'a=1&b=2'
ObjectUtils.fromQueryString('a=1&b=2'); // { a: '1', b: '2' }

// Flatten/Unflatten
ObjectUtils.flatten({ a: { b: { c: 1 } } }); // { 'a.b.c': 1 }
ObjectUtils.unflatten({ 'a.b.c': 1 }); // { a: { b: { c: 1 } } }

// Compare
ObjectUtils.equals(obj1, obj2);
```

## Number Utilities

```typescript
import { NumberUtils } from '@common/utils';

// Rounding
NumberUtils.round(1.234, 2); // 1.23
NumberUtils.floor(1.234, 2); // 1.23
NumberUtils.ceil(1.234, 2); // 1.24

// Formatting
NumberUtils.format(1234.56); // '1,234.56'
NumberUtils.formatCurrency(1234.56); // '$1,234.56'
NumberUtils.formatPercentage(75); // '75%'

// Clamping
NumberUtils.clamp(5, 0, 10); // 5
NumberUtils.clamp(15, 0, 10); // 10

// Check properties
NumberUtils.isEven(4); // true
NumberUtils.isOdd(5); // true
NumberUtils.isPrime(7); // true
NumberUtils.isInteger(5); // true
NumberUtils.isFinite(5); // true

// Math operations
NumberUtils.abs(-5); // 5
NumberUtils.min(1, 2, 3); // 1
NumberUtils.max(1, 2, 3); // 3
NumberUtils.average(1, 2, 3); // 2
NumberUtils.sum(1, 2, 3); // 6

// Percentage
NumberUtils.percentage(100, 25); // 25
NumberUtils.percentageIncrease(100, 150); // 50
NumberUtils.percentageDecrease(150, 100); // 33.33

// Parsing
NumberUtils.parseInt('123'); // 123
NumberUtils.parseFloat('123.45'); // 123.45

// Random
NumberUtils.random(1, 10); // Random integer between 1-10
NumberUtils.randomFloat(1, 10); // Random float between 1-10

// Format bytes
NumberUtils.formatBytes(1024); // '1 KB'
NumberUtils.formatBytes(1048576); // '1 MB'
```

## Usage Examples

### In Services

```typescript
import { StringUtils, ArrayUtils, DateUtils } from '@common/utils';

@Injectable()
export class CourseService {
  async getCourses(query: string) {
    // Normalize search query
    const slug = StringUtils.toSlug(query);
    
    // Get courses and sort
    const courses = await this.repository.find();
    return ArrayUtils.sortBy(courses, 'createdAt', 'desc');
  }

  async getUpcomingCourses() {
    const courses = await this.repository.find();
    const now = new Date();
    
    // Filter courses starting in next 7 days
    return courses.filter(course => {
      const daysUntilStart = DateUtils.diffInDays(now, course.startDate);
      return daysUntilStart > 0 && daysUntilStart <= 7;
    });
  }
}
```

### In Controllers

```typescript
import { NumberUtils, ObjectUtils } from '@common/utils';

@Controller('analytics')
export class AnalyticsController {
  @Get('summary')
  async getSummary() {
    const data = await this.analyticsService.getData();
    
    // Format numbers for response
    return ObjectUtils.mapValues(data, (value) => {
      if (typeof value === 'number') {
        return NumberUtils.format(value);
      }
      return value;
    });
  }
}
```

## Best Practices

1. **Import specific utilities**: `import { StringUtils } from '@common/utils'`
2. **Use for common operations**: Reduces code duplication
3. **Combine utilities**: Chain operations for complex transformations
4. **Test thoroughly**: Utilities are critical for data integrity
5. **Document custom extensions**: If adding new utilities, document them

## Performance Considerations

- `deepClone` is expensive for large objects - use sparingly
- `flatten` and `unflatten` are recursive - watch for deep nesting
- Array operations create new arrays - consider memory usage
- Use `groupBy` instead of manual loops for better readability
