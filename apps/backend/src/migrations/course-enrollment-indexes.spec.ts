/**
 * Issue #1293 - Review indexes for courses and enrollments
 *
 * Acceptance criteria:
 * - Migrations exist for indexes on courses and enrollments
 * - Every index created in up() is dropped in down() (reversible)
 */
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.resolve(__dirname);
const TARGET_TABLES = ['courses', 'enrollments'];

function migrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .map((f) => path.join(MIGRATIONS_DIR, f));
}

function methodBody(content: string, method: 'up' | 'down'): string {
  const start = content.search(new RegExp(`async\\s+${method}\\s*\\(`));
  if (start === -1) return '';
  const rest = content.slice(start + 1);
  const nextStart = rest.search(/async\s+(up|down)\s*\(/);
  return nextStart === -1 ? content.slice(start) : content.slice(start, start + 1 + nextStart);
}

function createdIndexNames(upBody: string): string[] {
  const named = [...upBody.matchAll(/name:\s*['"]([A-Za-z0-9_]+)['"]/g)].map((m) => m[1]);
  const sqlCreated = [
    ...upBody.matchAll(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?([A-Za-z0-9_]+)["']?/gi),
  ].map((m) => m[1]);
  return [...new Set([...named, ...sqlCreated])].filter((n) =>
    /^idx_(courses|enrollments)/i.test(n)
  );
}

function touchesTargetTables(upBody: string): boolean {
  return TARGET_TABLES.some((table) =>
    new RegExp(`['"\`]${table}['"\`]|\\b${table}\\b`).test(upBody)
  );
}

describe('Issue #1293 - Course and enrollment index migrations', () => {
  const migrations = migrationFiles().map((file) => ({
    file,
    content: fs.readFileSync(file, 'utf8'),
  }));

  const indexMigrations = migrations.filter(({ content }) =>
    touchesTargetTables(methodBody(content, 'up'))
  );

  it('at least one migration adds indexes on courses or enrollments', () => {
    expect(indexMigrations.length).toBeGreaterThan(0);
  });

  it('each index migration defines both up() and down()', () => {
    for (const { file, content } of indexMigrations) {
      expect({ file, hasUp: methodBody(content, 'up') !== '' }).toEqual({ file, hasUp: true });
      expect({ file, hasDown: methodBody(content, 'down') !== '' }).toEqual({
        file,
        hasDown: true,
      });
    }
  });

  it('every index created in up() is dropped in down()', () => {
    for (const { file, content } of indexMigrations) {
      const created = createdIndexNames(methodBody(content, 'up'));
      const down = methodBody(content, 'down');
      for (const name of created) {
        expect({ file, name, droppedInDown: down.includes(name) }).toEqual({
          file,
          name,
          droppedInDown: true,
        });
      }
    }
  });
});
