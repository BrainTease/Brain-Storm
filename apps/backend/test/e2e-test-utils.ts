/**
 * Per-test data cleanup helpers for the E2E suites (#1362).
 *
 * E2E specs seed users, courses, enrollments and certificates. When those
 * rows survive into the next test, the suite becomes order-dependent: a spec
 * that expects "no certificate for this user" fails because an earlier test
 * already issued one, and a spec that re-runs fails because the seeded user
 * already exists.
 *
 * The helpers below reset the database to a known-empty state *between* tests
 * so every spec starts from the same baseline and can run in any order.
 *
 * The deletion order is derived from the TypeORM entity metadata rather than
 * hard-coded, so adding an entity to the test module does not require editing
 * this file.
 */

import { DataSource, EntityMetadata } from 'typeorm';

/**
 * Maps each table to the tables it references through owning relations.
 */
function buildReferenceMap(metadatas: EntityMetadata[]): Map<string, Set<string>> {
  const references = new Map<string, Set<string>>();

  for (const metadata of metadatas) {
    const targets = new Set<string>();
    for (const relation of metadata.relations) {
      if (!relation.isOwner) continue;
      const target = relation.inverseEntityMetadata?.tableName;
      if (target && target !== metadata.tableName) {
        targets.add(target);
      }
    }
    references.set(metadata.tableName, targets);
  }

  return references;
}

/**
 * Returns the table names ordered so that a table is always deleted before
 * the tables it references (i.e. children first, parents last).
 */
export function buildDeletionOrder(dataSource: DataSource): string[] {
  const references = buildReferenceMap(dataSource.entityMetadatas);
  const depth = new Map<string, number>();

  const depthOf = (table: string, seen: Set<string>): number => {
    const cached = depth.get(table);
    if (cached !== undefined) return cached;
    // A cycle would otherwise recurse forever; treat it as a leaf.
    if (seen.has(table)) return 0;
    seen.add(table);

    let value = 0;
    for (const target of references.get(table) ?? []) {
      value = Math.max(value, depthOf(target, seen) + 1);
    }

    seen.delete(table);
    depth.set(table, value);
    return value;
  };

  for (const table of references.keys()) {
    depthOf(table, new Set());
  }

  return [...references.keys()].sort((a, b) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0));
}

/**
 * Removes every row from the tables backing the entities registered on the
 * given data source, so the next test starts from an empty database.
 */
export async function clearE2ETestData(dataSource: DataSource): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    for (const table of buildDeletionOrder(dataSource)) {
      await queryRunner.query(`DELETE FROM "${table}"`);
    }
  } finally {
    await queryRunner.release();
  }
}
