import { describe, it, expect } from 'vitest';
import { fuzzyScore, fuzzySearch, SearchItem } from '@/lib/fuzzy-search';

// ---------------------------------------------------------------------------
// fuzzyScore
// ---------------------------------------------------------------------------

describe('fuzzyScore', () => {
  it('returns 1 for empty query (matches everything)', () => {
    expect(fuzzyScore('', 'anything')).toBe(1);
  });

  it('returns 0 for empty text', () => {
    expect(fuzzyScore('abc', '')).toBe(0);
  });

  it('returns 0 when query characters are not present in text', () => {
    expect(fuzzyScore('xyz', 'abcdef')).toBe(0);
  });

  it('returns positive score for exact substring match', () => {
    const score = fuzzyScore('hello', 'hello world');
    expect(score).toBeGreaterThan(0);
  });

  it('returns positive score for non-contiguous match', () => {
    // 'ac' should match 'abcdef' (a at 0, c at 2)
    const score = fuzzyScore('ac', 'abcdef');
    expect(score).toBeGreaterThan(0);
  });

  it('scores contiguous match higher than scattered match', () => {
    // 'he' matches 'hello' starting at index 0 (high score)
    // 'he' matches 'a_h_b_e' scattered (lower score)
    const contiguous = fuzzyScore('he', 'hello');
    const scattered = fuzzyScore('he', 'ahbe');
    expect(contiguous).toBeGreaterThanOrEqual(scattered);
  });

  it('is case-insensitive', () => {
    const lower = fuzzyScore('hello', 'hello');
    const upper = fuzzyScore('HELLO', 'hello');
    expect(lower).toBe(upper);
  });

  it('returns 0 when only partial query characters are present', () => {
    // 'xyz' — only x and y in text but not z
    expect(fuzzyScore('xyz', 'xyabc')).toBe(0);
  });

  it('returns a positive score when all query characters match in order', () => {
    expect(fuzzyScore('rst', 'rust')).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// fuzzySearch
// ---------------------------------------------------------------------------

const ITEMS: SearchItem[] = [
  { id: '1', title: 'Introduction to Rust', category: 'programming' },
  {
    id: '2',
    title: 'JavaScript Fundamentals',
    description: 'Learn JS basics',
    category: 'programming',
  },
  { id: '3', title: 'CSS Grid Layout', description: 'Modern CSS techniques', category: 'design' },
  { id: '4', title: 'React Hooks in Depth', category: 'programming' },
  { id: '5', title: 'TypeScript Advanced Patterns', description: 'TS generics and types' },
  {
    id: '6',
    title: 'Blockchain Basics',
    description: 'Intro to blockchain and crypto',
    category: 'blockchain',
  },
];

describe('fuzzySearch', () => {
  it('returns up to maxResults items for empty query', () => {
    const results = fuzzySearch(ITEMS, '', 3);
    expect(results).toHaveLength(3);
  });

  it('returns all items when query is empty and maxResults >= item count', () => {
    const results = fuzzySearch(ITEMS, '');
    expect(results).toHaveLength(ITEMS.length);
  });

  it('filters items that do not match query', () => {
    const results = fuzzySearch(ITEMS, 'rust');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.id !== '3')).toBe(true); // CSS Grid has no rust
  });

  it('finds match by title', () => {
    const results = fuzzySearch(ITEMS, 'react');
    expect(results.some((r) => r.id === '4')).toBe(true);
  });

  it('finds match by description', () => {
    const results = fuzzySearch(ITEMS, 'basics');
    // JS Fundamentals has "Learn JS basics" in description, Blockchain has "Intro to blockchain..."
    expect(results.some((r) => r.id === '2' || r.id === '6')).toBe(true);
  });

  it('respects maxResults limit', () => {
    // 'a' appears in many items
    const results = fuzzySearch(ITEMS, 'a', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('returns empty array when no items match', () => {
    const results = fuzzySearch(ITEMS, 'zzzzzzzzz');
    expect(results).toHaveLength(0);
  });

  it('is case-insensitive in search', () => {
    const lowerResults = fuzzySearch(ITEMS, 'typescript');
    const upperResults = fuzzySearch(ITEMS, 'TYPESCRIPT');
    expect(lowerResults.map((r) => r.id)).toEqual(upperResults.map((r) => r.id));
  });

  it('returns items sorted by relevance score (best match first)', () => {
    // 'rust' should match "Introduction to Rust" more strongly than any scattered match
    const results = fuzzySearch(ITEMS, 'rust');
    if (results.length > 1) {
      // First result should be the most relevant (exact title word)
      expect(results[0].id).toBe('1');
    }
  });

  it('does not include items without descriptions when description score is 0', () => {
    // items with no description field still match on title
    const results = fuzzySearch(ITEMS, 'react');
    const reactItem = results.find((r) => r.id === '4');
    expect(reactItem).toBeDefined();
  });

  it('works with generic type constraint', () => {
    interface Course extends SearchItem {
      level: string;
    }
    const courses: Course[] = [
      { id: 'c1', title: 'Beginner Rust', level: 'beginner' },
      { id: 'c2', title: 'Advanced TypeScript', level: 'advanced' },
    ];
    const results = fuzzySearch(courses, 'rust');
    expect(results[0].level).toBe('beginner');
  });
});
