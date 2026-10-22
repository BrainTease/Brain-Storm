/**
 * Issue #1285: Lazy-load images with explicit dimensions
 * Every content <img> must declare width and height (prevents layout shift)
 * and use loading="lazy" unless it is marked as priority (above the fold).
 * CLS before/after is measured with Lighthouse, not by this test.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const SRC_DIR = path.resolve(__dirname, '..');
const IMG_TAG = /<img\b[\s\S]*?\/?>/g;

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

const collectProblems = (): string[] => {
  const problems: string[] = [];
  for (const file of walk(SRC_DIR)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const [tag] of source.matchAll(IMG_TAG)) {
      const rel = path.relative(SRC_DIR, file);
      if (!/\swidth=/.test(tag) || !/\sheight=/.test(tag)) {
        problems.push(`${rel}: <img> missing width/height`);
      }
      if (!/loading="lazy"/.test(tag) && !/\spriority\b/.test(tag)) {
        problems.push(`${rel}: <img> missing loading="lazy"`);
      }
    }
  }
  return problems;
};

describe('Image dimensions and lazy loading - Issue #1285', () => {
  it('every <img> declares width and height', () => {
    const problems = collectProblems().filter((p) => p.includes('missing width/height'));
    expect(problems).toEqual([]);
  });

  it('every non-priority <img> uses loading="lazy"', () => {
    const problems = collectProblems().filter((p) => p.includes('missing loading'));
    expect(problems).toEqual([]);
  });
});
