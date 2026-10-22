/**
 * Quality Gate — TODO/FIXME markers (#1379)
 *
 * Every TODO or FIXME in source code must reference a GitHub issue number
 * (e.g. `// TODO(#123):` or `// FIXME #456`).
 *
 * Bare markers with no issue reference are not allowed because they have no
 * owner, no due date, and cannot be tracked or closed.
 *
 * Scanned directories: apps/, contracts/, packages/
 * Excluded: node_modules, dist, build, coverage, .next, __snapshots__
 *
 * Allowed pattern:  TODO(#NNN) | TODO #NNN | FIXME(#NNN) | FIXME #NNN
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';

const SCAN_DIRS = ['apps', 'contracts', 'packages'];

const EXCLUDED_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '__snapshots__',
  'target',
]);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.rs']);

/** Matches a bare TODO/FIXME with no issue reference. */
const BARE_MARKER = /\b(TODO|FIXME)\b(?!\s*\(?\s*#\d+)/;

/** Matches a properly linked TODO/FIXME — e.g. TODO(#123) or FIXME #456 */
const LINKED_MARKER = /\b(TODO|FIXME)\s*\(?\s*#\d+/;

interface Violation {
  file: string;
  line: number;
  text: string;
}

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (EXCLUDED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walk(full));
    } else if (SOURCE_EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

function collectViolations(): Violation[] {
  const violations: Violation[] = [];

  for (const dir of SCAN_DIRS) {
    const absDir = join(process.cwd(), dir);
    let files: string[];
    try {
      files = walk(absDir);
    } catch {
      // Directory may not exist in all environments
      continue;
    }

    for (const file of files) {
      // Skip this file itself to avoid false positives on the regex literals
      if (basename(file) === 'todo-markers.test.ts') continue;

      const lines = readFileSync(file, 'utf-8').split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Only check lines that contain TODO or FIXME as a comment marker
        if (!line.includes('TODO') && !line.includes('FIXME')) continue;
        // Skip lines that are inside string literals (test fixture code, etc.)
        // Simple heuristic: skip if the marker appears only inside quotes
        const stripped = line.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '""');
        if (!BARE_MARKER.test(stripped)) continue;
        // Double-check it's not actually linked
        if (LINKED_MARKER.test(stripped)) continue;

        violations.push({
          file: file.replace(process.cwd() + '\\', '').replace(process.cwd() + '/', ''),
          line: i + 1,
          text: line.trim().slice(0, 120),
        });
      }
    }
  }

  return violations;
}

describe('TODO/FIXME markers are tracked (#1379)', () => {
  it('has no bare TODO or FIXME without an issue reference', () => {
    const violations = collectViolations();

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}:${v.line}  →  ${v.text}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} unlinked TODO/FIXME marker(s).\n` +
          `Add an issue reference, e.g. "TODO(#123):", or delete the comment.\n\n` +
          msg,
      );
    }

    expect(violations).toHaveLength(0);
  });

  it('source files use linked format when TODO/FIXME is needed', () => {
    // Positive example: verify the regex accepts linked markers correctly
    expect(LINKED_MARKER.test('// TODO(#1379): implement this')).toBe(true);
    expect(LINKED_MARKER.test('// FIXME #42 — broken')).toBe(true);
    expect(BARE_MARKER.test('// TODO(#1379): implement this')).toBe(false);
    expect(BARE_MARKER.test('// TODO: no issue')).toBe(true);
    expect(BARE_MARKER.test('// FIXME — broken')).toBe(true);
  });
});
