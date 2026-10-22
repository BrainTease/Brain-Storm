/**
 * Guards issue #1278: `useAuth` is the only React-facing reader of auth state.
 * Components must not read the auth store or the auth localStorage entry directly.
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const SRC_DIR = path.resolve(__dirname, '..');

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : listSourceFiles(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

// Files allowed to touch the auth store directly:
// the store itself, the hook that wraps it, and the non-React API client singleton.
const ALLOWED_STORE_READERS = new Set([
  path.join(SRC_DIR, 'store', 'auth.store.ts'),
  path.join(SRC_DIR, 'hooks', 'useAuth.ts'),
  path.join(SRC_DIR, 'lib', 'api.ts'),
  path.join(SRC_DIR, 'store', 'app.store.ts'),
]);

describe('Auth single source of truth - Issue #1278', () => {
  const files = listSourceFiles(SRC_DIR);

  it('no component or hook imports the auth store outside useAuth', () => {
    const offenders = files
      .filter((file) => !ALLOWED_STORE_READERS.has(file))
      .filter((file) =>
        /^import (?!type )[^;]*from ['"]@\/store\/auth\.store['"]/m.test(
          fs.readFileSync(file, 'utf-8')
        )
      )
      .map((file) => path.relative(SRC_DIR, file));

    expect(offenders).toEqual([]);
  });

  it('no direct localStorage access for the auth token', () => {
    const offenders = files
      .filter((file) =>
        /localStorage\.(get|set|remove)Item\(\s*['"`]access_token['"`]/.test(
          fs.readFileSync(file, 'utf-8')
        )
      )
      .map((file) => path.relative(SRC_DIR, file));

    expect(offenders).toEqual([]);
  });
});
