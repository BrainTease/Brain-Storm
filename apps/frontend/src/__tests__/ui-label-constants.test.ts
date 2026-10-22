/**
 * Issue #1284: Consolidate repeated UI string literals
 * A short JSX label literal must not be repeated verbatim across 3+ component
 * files; repeated labels belong in a shared constants module.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const SRC_DIR = path.resolve(__dirname, '..');
const JSX_LABEL = />\s*([A-Z][A-Za-z ]{2,24})\s*</g;
const MAX_FILES = 2;

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

const labelFileCounts = (): Map<string, Set<string>> => {
  const counts = new Map<string, Set<string>>();
  for (const file of walk(path.join(SRC_DIR, 'components'))) {
    const rel = path.relative(SRC_DIR, file);
    for (const match of fs.readFileSync(file, 'utf8').matchAll(JSX_LABEL)) {
      const label = match[1].trim();
      if (!counts.has(label)) counts.set(label, new Set());
      counts.get(label)!.add(rel);
    }
  }
  return counts;
};

describe('Shared UI label constants - Issue #1284', () => {
  it('no repeated JSX label literal appears in 3+ component files', () => {
    const repeated = [...labelFileCounts()]
      .filter(([, files]) => files.size > MAX_FILES)
      .map(([label, files]) => `${label} (${files.size} files)`);
    expect(repeated).toEqual([]);
  });
});
