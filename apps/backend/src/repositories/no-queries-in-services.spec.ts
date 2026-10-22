/**
 * Issue #1292 - Move raw queries out of services into repositories
 *
 * Acceptance criteria:
 * - No query builder call in services
 * - Query code lives in repository classes under src/repositories
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..');

const QUERY_PATTERNS = [
  /\.createQueryBuilder\s*\(/,
  /\b(?:dataSource|entityManager|manager)\.query\s*\(/,
];

function listFiles(dir: string, predicate: (file: string) => boolean): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full, predicate);
    return predicate(full) ? [full] : [];
  });
}

function isServiceSource(file: string): boolean {
  return file.endsWith('.service.ts') && !file.endsWith('.spec.ts');
}

describe('Issue #1292 - No raw queries in services', () => {
  const services = listFiles(SRC_ROOT, isServiceSource);

  it('finds service files to check', () => {
    expect(services.length).toBeGreaterThan(0);
  });

  it('no service calls createQueryBuilder or a raw query', () => {
    const offenders = services
      .filter((file) => {
        const content = fs.readFileSync(file, 'utf8');
        return QUERY_PATTERNS.some((pattern) => pattern.test(content));
      })
      .map((file) => path.relative(SRC_ROOT, file));

    expect(offenders).toEqual([]);
  });

  it('repository layer exists for query code', () => {
    const repoDir = path.join(SRC_ROOT, 'repositories');
    expect(fs.existsSync(repoDir)).toBe(true);
    const repos = listFiles(repoDir, (f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
    expect(repos.length).toBeGreaterThan(0);
  });
});
