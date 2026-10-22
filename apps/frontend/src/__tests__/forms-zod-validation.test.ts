/**
 * Issue #1281: converted forms validate through react-hook-form + zod schemas,
 * and invalid input is rejected by those schemas rather than hand-written checks.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { threadSchema } from '@/components/forum/CreateThreadModal';
import { reviewSchema } from '@/components/reviews/ReviewForm';

describe('CreateThreadModal schema - Issue #1281', () => {
  const valid = { title: 'How do I stake?', content: 'Some details' };

  it('accepts a valid thread', () => {
    expect(threadSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an empty title', () => {
    const result = threadSchema.safeParse({ ...valid, title: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Title is required');
  });

  it('rejects a whitespace-only title', () => {
    expect(threadSchema.safeParse({ ...valid, title: '   ' }).success).toBe(false);
  });

  it('rejects a title longer than 200 characters', () => {
    expect(threadSchema.safeParse({ ...valid, title: 'a'.repeat(201) }).success).toBe(false);
  });

  it('rejects empty content', () => {
    const result = threadSchema.safeParse({ ...valid, content: '  ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Content is required');
  });

  it('returns trimmed values on success', () => {
    const result = threadSchema.parse({ title: '  Hi  ', content: '  body ' });
    expect(result).toEqual({ title: 'Hi', content: 'body' });
  });
});

describe('ReviewForm schema - Issue #1281', () => {
  const valid = { rating: 4, text: 'Great course' };

  it('accepts a valid review', () => {
    expect(reviewSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects a missing rating', () => {
    const result = reviewSchema.safeParse({ ...valid, rating: 0 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Please select a rating');
  });

  it('rejects a rating above 5', () => {
    expect(reviewSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
  });

  it('rejects blank review text', () => {
    const result = reviewSchema.safeParse({ ...valid, text: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Please write a review');
  });

  it('rejects review text over 1000 characters', () => {
    expect(reviewSchema.safeParse({ ...valid, text: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('Converted forms have no hand-written validation - Issue #1281', () => {
  const converted = [
    path.resolve(__dirname, '../components/forum/CreateThreadModal.tsx'),
    path.resolve(__dirname, '../components/reviews/ReviewForm.tsx'),
  ];

  it.each(converted)('%s uses zodResolver and has no manual trim checks', (file) => {
    const content = fs.readFileSync(file, 'utf-8');

    expect(content).toMatch(/zodResolver\(/);
    expect(content).not.toMatch(/if \(!\w+\.trim\(\)\)/);
  });
});
