/**
 * Quality invariant: canonical domain types live in `packages/types` only.
 *
 * NOT covered by ESLint/Sonar:
 *   - ESLint sees two identical interfaces in different packages as unrelated.
 *   - Sonar flags *some* duplication, but not "same-named domain type in
 *     the wrong package". This test enforces the architectural rule that
 *     shared domain contracts have a single home.
 *
 * Purpose: prevent frontend from re-declaring types that already exist
 * in `packages/types`, which causes silent drift when one side updates.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

const SHARED_TYPES_DIR = path.join(ROOT, 'packages/types/src');
const FRONTEND_TYPES_DIR = path.join(ROOT, 'apps/frontend/src/types');
const BACKEND_TYPES_DIR = path.join(ROOT, 'apps/backend/src/types');

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'coverage']);

function collectTypeNames(dir: string): Set<string> {
  const names = new Set<string>();
  if (!fs.existsSync(dir)) return names;

  function walk(current: string) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
        const content = fs.readFileSync(full, 'utf-8');
        const matches = content.matchAll(
          /^\s*export\s+(?:interface|type)\s+([A-Za-z_][A-Za-z0-9_]*)/gm,
        );
        for (const m of matches) names.add(m[1]);
      }
    }
  }

  walk(dir);
  return names;
}

describe('Canonical domain types live in packages/types', () => {
  const shared = collectTypeNames(SHARED_TYPES_DIR);
  const frontend = collectTypeNames(FRONTEND_TYPES_DIR);
  const backend = collectTypeNames(BACKEND_TYPES_DIR);

  it('no frontend type duplicates a shared type name', () => {
    const dupes = [...shared].filter((n) => frontend.has(n));
    if (dupes.length > 0) {
      // eslint-disable-next-line no-console -- test diagnostic output
      console.error('Duplicate type names (frontend ↔ packages/types):', dupes);
    }
    expect(dupes).toHaveLength(0);
  });

  it('no backend type duplicates a shared type name', () => {
    const dupes = [...shared].filter((n) => backend.has(n));
    if (dupes.length > 0) {
      // eslint-disable-next-line no-console -- test diagnostic output
      console.error('Duplicate type names (backend ↔ packages/types):', dupes);
    }
    expect(dupes).toHaveLength(0);
  });

  it('packages/types has a barrel export', () => {
    const indexPath = path.join(SHARED_TYPES_DIR, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toMatch(/export\s+\*/);
    }
  });
});
