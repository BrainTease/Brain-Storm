/**
 * Issue #1282: Replace index-based React keys
 * Dynamic lists must key items by entity ID, not by array index, so that
 * reordering does not reuse component state for the wrong item.
 * Skeleton/loading placeholders are static and are excluded.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const SRC_DIR = path.resolve(__dirname, '..');
const INDEX_KEY = /key=\{\s*(?:i|idx|index)\s*\}/;
const PLACEHOLDER = /Skeleton|animate-pulse|loading/i;

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') walk(full, out);
    } else if (/\.tsx$/.test(entry.name) && !/\.(test|stories)\.tsx$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const findIndexKeyUsages = (): string[] => {
  const hits: string[] = [];
  for (const file of walk(SRC_DIR)) {
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, n) => {
        if (INDEX_KEY.test(line) && !PLACEHOLDER.test(line)) {
          hits.push(`${path.relative(SRC_DIR, file)}:${n + 1}`);
        }
      });
  }
  return hits;
};

describe('Index-based keys - Issue #1282', () => {
  it('dynamic lists do not use array index as React key', () => {
    expect(findIndexKeyUsages()).toEqual([]);
  });

  it('the scanner detects index keys in its own fixture (sanity check)', () => {
    expect(INDEX_KEY.test('<li key={index}>')).toBe(true);
    expect(INDEX_KEY.test('<li key={item.id}>')).toBe(false);
  });
});
