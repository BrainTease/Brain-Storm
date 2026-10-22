/**
 * Guard for issue #1295 – all logging goes through the common logger.
 *
 * Scans production TypeScript under apps/backend/src (test specs are excluded,
 * as in logging-cleanup.spec.ts) and fails if a real `console.*(` call is found.
 * Comment lines and string literals (e.g. generated code samples) are ignored.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..', '..');
const CONSOLE_CALL = /(^|[^'"`\w.])console\.(log|error|warn|debug|info)\s*\(/;
const TEST_FILE = /[.-]spec\.ts$/;

function collectTsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectTsFiles(full);
    return entry.name.endsWith('.ts') && !TEST_FILE.test(entry.name) ? [full] : [];
  });
}

describe('Issue #1295 – no console calls under apps/backend/src', () => {
  it('routes all logging through the Nest/common logger', () => {
    const offenders = collectTsFiles(SRC_ROOT).flatMap((file) =>
      fs
        .readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ line, index }))
        .filter(({ line }) => {
          const trimmed = line.trimStart();
          if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
            return false;
          }
          return CONSOLE_CALL.test(line);
        })
        .map(({ line, index }) => `${path.relative(SRC_ROOT, file)}:${index + 1}: ${line.trim()}`)
    );

    expect(offenders).toEqual([]);
  });
});
