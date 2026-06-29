# Database Migration Practices & Zero-Downtime Deployments

> **Last updated:** 2026-06-28  
> **Status:** Adopted  
> **Applies to:** All database schema changes in Brain-Storm

---

## Table of Contents

1. [Expand/Contract Migration Pattern](#1-expandcontract-migration-pattern)
   - [What Is Expand/Contract?](#11-what-is-expandcontract)
   - [Why Use It?](#12-why-use-it)
   - [Phase 1: Expand](#13-phase-1-expand)
   - [Phase 2: Migrate](#14-phase-2-migrate)
   - [Phase 3: Contract](#15-phase-3-contract)
   - [Real-World Examples](#16-real-world-examples)
2. [Migration Lint / Review Checklist](#2-migration-lint--review-checklist)
   - [Automated Checks](#21-automated-checks)
   - [Manual Review Checklist](#22-manual-review-checklist)
3. [Backfill Job Template](#3-backfill-job-template)
   - [When to Use a Backfill](#31-when-to-use-a-backfill)
   - [Template: NestJS Backfill Command](#32-template-nestjs-backfill-command)
   - [Template: SQL Batch Backfill](#33-template-sql-batch-backfill)
4. [CI Check for Destructive Migrations](#4-ci-check-for-destructive-migrations)
   - [CI Workflow Integration](#41-ci-workflow-integration)
   - [Destructive Operations List](#42-destructive-operations-list)
5. [Related Documentation](#5-related-documentation)

---

## 1. Expand/Contract Migration Pattern

### 1.1 What Is Expand/Contract?

Expand/Contract (also called "Parallel Change" or "Toggle Pattern") is a three-phase strategy for evolving a database schema **without downtime**. The key principle is:

> **Never make a breaking schema change in a single deployment.**

Instead, each change is split across **three deployments**, ensuring the old and new code paths can coexist at every step.

```
┌───────────────────────────────────────────────────────────┐
│                    Expand/Contract Flow                    │
├───────────────────────────────────────────────────────────┤
│  Deployment 1:  EXPAND  →  Add new column/table            │
│  Deployment 2:  MIGRATE →  Backfill data, switch reads     │
│  Deployment 3:  CONTRACT → Drop old column/table           │
└───────────────────────────────────────────────────────────┘
```

### 1.2 Why Use It?

| Benefit | Description |
|---------|-------------|
| **Zero downtime** | No `ACCESS EXCLUSIVE` locks that block reads/writes |
| **Rollback safety** | Each phase is reversible independently |
| **Gradual rollout** | Canary or blue/green deployments work naturally |
| **Team coordination** | Decouples schema changes from application code changes |

### 1.3 Phase 1: Expand

**Goal:** Add the new schema elements without affecting existing queries.

**Rules:**
- New columns must be **nullable** or have a **default value**
- New tables must not have `NOT NULL` constraints without defaults
- New indexes should use `CONCURRENTLY` to avoid table locks

**Example — Adding a `display_name` column:**

```typescript
// Migration: Expand phase
public async up(queryRunner: QueryRunner): Promise<void> {
  // ✅ Safe: new column is nullable
  await queryRunner.addColumn('users', new TableColumn({
    name: 'display_name',
    type: 'varchar',
    isNullable: true,              // ← Critical: must be nullable
  }));

  // ✅ Safe: new index created without locking
  await queryRunner.query(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS
    idx_users_display_name ON users (display_name)
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.dropIndex('users', 'idx_users_display_name');
  await queryRunner.dropColumn('users', 'display_name');
}
```

**Deployment 1:** Deploy this migration + application code that **writes to both** `username` and `display_name`, but **reads only from** `username`.

### 1.4 Phase 2: Migrate

**Goal:** Backfill existing data into the new schema elements and switch reads.

**Steps:**
1. Run a backfill job to populate `display_name` for existing rows
2. Deploy application code that **reads from** `display_name` (while still writing to both)
3. Monitor for errors or data inconsistencies
4. Once verified, remove writes to the old column from application code

```typescript
// No migration needed in Phase 2 — backfill is a data operation
// See Section 3 for backfill templates
```

**Deployment 2:** Deploy backfill + updated application code that uses `display_name`.

### 1.5 Phase 3: Contract

**Goal:** Remove the old schema elements after confirming no code paths depend on them.

**Rules:**
- Wait at least **one full release cycle** after Phase 2
- Verify no running instances still reference the old column
- Monitor error rates for 24 hours after removal

```typescript
// Migration: Contract phase
public async up(queryRunner: QueryRunner): Promise<void> {
  // ✅ Safe: no code reads from this column anymore
  await queryRunner.dropColumn('users', 'username');
}

public async down(queryRunner: QueryRunner): Promise<void> {
  // Restore the column if rollback is needed
  await queryRunner.addColumn('users', new TableColumn({
    name: 'username',
    type: 'varchar',
    isNullable: true,
    isUnique: true,
  }));
}
```

**Deployment 3:** Deploy contract migration.

### 1.6 Real-World Examples

#### 1.6.1 Renaming a Column (`email` → `primary_email`)

| Phase | Schema Change | Application Code |
|-------|--------------|------------------|
| **Expand** | Add `primary_email` (nullable) | Write to both `email` and `primary_email`; read from `email` |
| **Migrate** | Backfill `primary_email = email` | Read from `primary_email`; write to both |
| **Contract** | Drop `email` | Use only `primary_email` |

#### 1.6.2 Splitting a Table (Single `users` → `users` + `user_profiles`)

| Phase | Schema Change | Application Code |
|-------|--------------|------------------|
| **Expand** | Create `user_profiles` table; add FK to `users` | Write to both tables; read from `users` |
| **Migrate** | Backfill `user_profiles` from `users` profile columns | Read from `user_profiles`; write to both |
| **Contract** | Drop profile columns from `users` | Use only `user_profiles` |

#### 1.6.3 Adding a NOT NULL Constraint

```typescript
// ❌ Bad: Direct NOT NULL addition — locks the table and may fail
// ALTER TABLE users ALTER COLUMN email SET NOT NULL;

// ✅ Good: Two-phase expand/contract
// Phase 1: Add check constraint (not validated)
// Phase 2: Validate and make NOT NULL
public async up(queryRunner: QueryRunner): Promise<void> {
  // Step 1: Backfill any NULL values (run backfill job first)
  // Step 2: Add NOT NULL with validation only (no lock)
  await queryRunner.query(`
    ALTER TABLE users
    ALTER COLUMN email SET NOT NULL
  `);
}
```

---

## 2. Migration Lint / Review Checklist

### 2.1 Automated Checks

These checks run in CI for every PR that modifies migration files:

| # | Check | Description | Severity |
|---|-------|-------------|----------|
| 1 | **Naming convention** | File must match `{13-digit-timestamp}-{PascalCase}.ts` | ❌ Error |
| 2 | **Up method exists** | Migration must have a `public async up()` method | ❌ Error |
| 3 | **Down method exists** | Migration must have a `public async down()` method | ❌ Error |
| 4 | **No destructive ops** | Warn if migration contains `DROP TABLE`, `DROP COLUMN`, `ALTER COLUMN ... DROP NOT NULL` | ⚠️ Warning |
| 5 | **Sequential timestamps** | Timestamps must be in chronological order | ❌ Error |
| 6 | **No duplicate IDs** | No two migrations may share the same timestamp | ❌ Error |
| 7 | **CONCURRENTLY for indexes** | `CREATE INDEX` without `CONCURRENTLY` in production tables | ⚠️ Warning |

### 2.2 Manual Review Checklist

Code reviewers should verify each item before approving:

#### Safety

- [ ] Does the migration have a reversible `down()` method?
- [ ] Is this an **expand** phase (additive, non-breaking)?
- [ ] If **contract** phase (destructive), has the deprecation period been observed?
- [ ] Are new columns **nullable** or have **default values**?
- [ ] Are new indexes created **CONCURRENTLY** to avoid table locks?
- [ ] Does the migration avoid `ALTER COLUMN ... SET NOT NULL` on existing tables without backfill?
- [ ] Does the migration avoid `ALTER TABLE ... SET DEFAULT` that could lock the table?

#### Data Integrity

- [ ] Are foreign key constraints added with the correct `ON DELETE` behavior?
- [ ] Are unique constraints added without violating existing data?
- [ ] If renaming a column, does the down() method restore it properly?
- [ ] If adding a CHECK constraint, will existing data pass validation?

#### Performance

- [ ] Will this migration hold `ACCESS EXCLUSIVE` locks? How long?
- [ ] For large tables (>1M rows), has the migration been tested against a production-sized dataset?
- [ ] Are batch sizes used for data updates/backfills?
- [ ] Is the migration run outside peak traffic hours?

#### Rollback

- [ ] Can the `down()` method restore the schema completely?
- [ ] Are there data transformations in `up()` that cannot be perfectly reversed?
- [ ] If data is transformed in `up()`, is the old data backed up?
- [ ] Has the rollback been tested in a staging environment?

---

## 3. Backfill Job Template

### 3.1 When to Use a Backfill

A backfill is needed when:
- Adding a new column to an existing table with millions of rows
- Populating a new table from legacy data
- Transforming data in-place (e.g., normalizing a column)
- Migrating data between columns (e.g., `email` → `primary_email`)

### 3.2 Template: NestJS Backfill Command

Create this as `apps/backend/src/commands/backfill-display-name.command.ts`:

```typescript
import { Command, CommandRunner, Option } from 'nest-commander';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User } from '../users/user.entity';

interface BackfillOptions {
  batchSize?: number;
  dryRun?: boolean;
  force?: boolean;
}

@Command({
  name: 'backfill:display-name',
  description: 'Backfill display_name from username for existing users',
})
export class BackfillDisplayNameCommand extends CommandRunner {
  private readonly logger = new Logger(BackfillDisplayNameCommand.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super();
  }

  async run(
    _passedParams: string[],
    options: BackfillOptions,
  ): Promise<void> {
    const batchSize = options.batchSize ?? 1000;
    const dryRun = options.dryRun ?? false;
    const force = options.force ?? false;

    this.logger.log(`Starting backfill: display_name`);
    this.logger.log(`Batch size: ${batchSize}`);
    this.logger.log(`Dry run: ${dryRun}`);

    // Find records that need backfill
    const [total, count] = await this.userRepository.findAndCount({
      where: { displayName: null },
    });

    // If no rows need backfill, exit early
    if (count === 0) {
      this.logger.log('No records need backfill. Exiting.');
      return;
    }

    this.logger.log(`Found ${count} records to backfill`);

    if (!force && count > 100_000) {
      this.logger.warn(
        `Large backfill detected (${count} records). ` +
        `Use --force to proceed or increase batch size.`,
      );
      if (!dryRun) {
        process.exit(1);
      }
    }

    let processed = 0;
    let cursor: Date | null = null;

    while (processed < count) {
      // Keyset pagination (cursor-based) for efficiency
      const whereClause: any = { displayName: null };
      if (cursor) {
        whereClause.createdAt = LessThan(cursor);
      }

      const batch = await this.userRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
        take: batchSize,
      });

      if (batch.length === 0) break;

      if (!dryRun) {
        // Batch update
        for (const user of batch) {
          user.displayName = user.username || user.email.split('@')[0];
        }
        await this.userRepository.save(batch, { chunk: batchSize / 10 });
      }

      processed += batch.length;
      cursor = batch[batch.length - 1].createdAt;

      this.logger.log(
        `Progress: ${processed}/${count} (${Math.round((processed / count) * 100)}%)`,
      );
    }

    this.logger.log(`✅ Backfill completed. Processed ${processed} records.`);
  }

  @Option({
    flags: '--batch-size <size>',
    description: 'Number of records to process per batch (default: 1000)',
  })
  parseBatchSize(val: string): number {
    return parseInt(val, 10);
  }

  @Option({
    flags: '--dry-run',
    description: 'Simulate backfill without making changes',
  })
  parseDryRun(): boolean {
    return true;
  }

  @Option({
    flags: '--force',
    description: 'Skip safety prompts for large backfills',
  })
  parseForce(): boolean {
    return true;
  }
}
```

### 3.3 Template: SQL Batch Backfill

For very large datasets (>10M rows), use a SQL-based approach:

```sql
-- Batch backfill: display_name from username
-- Run in a transaction with periodic commits

DO $$
DECLARE
  batch_size INT := 10000;
  offset_val INT := 0;
  rows_affected INT;
  total_rows INT;
  processed INT := 0;
BEGIN
  -- Count total rows needing backfill
  SELECT COUNT(*) INTO total_rows
  FROM users
  WHERE display_name IS NULL;

  RAISE NOTICE 'Starting backfill for % rows', total_rows;

  LOOP
    WITH batch AS (
      SELECT id
      FROM users
      WHERE display_name IS NULL
      ORDER BY created_at DESC
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    )
    UPDATE users u
    SET display_name = COALESCE(u.username, SPLIT_PART(u.email, '@', 1))
    FROM batch
    WHERE u.id = batch.id;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    processed := processed + rows_affected;
    COMMIT;

    RAISE NOTICE 'Progress: %/% (%)',
      processed, total_rows,
      ROUND((processed::numeric / total_rows) * 100, 2);

    EXIT WHEN rows_affected < batch_size;
  END LOOP;

  RAISE NOTICE '✅ Backfill completed. Processed % rows.', processed;
END $$;
```

---

## 4. CI Check for Destructive Migrations

### 4.1 CI Workflow Integration

The following job should be added to `.github/workflows/database-migrations.yml`:

```yaml
  detect-destructive-migrations:
    name: Flag Destructive Migrations
    runs-on: ubuntu-latest
    needs: validate-migrations
    steps:
      - uses: actions/checkout@v4

      - name: Check for destructive operations
        id: destructive_check
        working-directory: apps/backend
        run: |
          DESTRUCTIVE_FOUND=false
          REPORT="# ⚠️ Destructive Migration Report\n\n"
          REPORT+="The following destructive operations were detected:\n\n"

          for file in $(git diff --name-only origin/main...HEAD -- 'src/migrations/*.ts' 2>/dev/null || ls src/migrations/*.ts); do
            if [ ! -f "$file" ]; then continue; fi

            filename=$(basename "$file")

            # Check for DROP TABLE
            if grep -qE "(await queryRunner\.dropTable|DROP TABLE)" "$file" 2>/dev/null; then
              REPORT+="- **$filename**: 🗑️ Contains \`DROP TABLE\`\n"
              DESTRUCTIVE_FOUND=true
            fi

            # Check for DROP COLUMN
            if grep -qE "(await queryRunner\.dropColumn|ALTER TABLE.*DROP COLUMN)" "$file" 2>/dev/null; then
              REPORT+="- **$filename**: 🗑️ Contains \`DROP COLUMN\`\n"
              DESTRUCTIVE_FOUND=true
            fi

            # Check for ALTER COLUMN ... DROP NOT NULL
            if grep -qE "DROP NOT NULL|SET NOT NULL" "$file" 2>/dev/null; then
              REPORT+="- **$filename**: ⚠️ Contains \`ALTER COLUMN ... (SET|DROP) NOT NULL\`\n"
              DESTRUCTIVE_FOUND=true
            fi

            # Check for DROP INDEX (without IF EXISTS safety)
            if grep -qE "await queryRunner\.dropIndex" "$file" 2>/dev/null; then
              REPORT+="- **$filename**: ⚠️ Contains \`DROP INDEX\` — ensure it uses CONCURRENTLY and IF EXISTS\n"
              DESTRUCTIVE_FOUND=true
            fi

            # Check for TRUNCATE
            if grep -qE "(TRUNCATE|await queryRunner\.query.*TRUNCATE)" "$file" 2>/dev/null; then
              REPORT+="- **$filename**: 🗑️ Contains \`TRUNCATE\` — data loss risk\n"
              DESTRUCTIVE_FOUND=true
            fi

            # Check for RENAME COLUMN (breaking for running code)
            if grep -qE "RENAME COLUMN" "$file" 2>/dev/null; then
              REPORT+="- **$filename**: ⚠️ Contains \`RENAME COLUMN\` — ensure expand/contract pattern\n"
              DESTRUCTIVE_FOUND=true
            fi
          done

          if [ "$DESTRUCTIVE_FOUND" = false ]; then
            REPORT+="\n✅ No destructive operations detected."
          else
            REPORT+="\n\n> **Action required:** Destructive migrations must follow the expand/contract pattern documented in DATABASE_MIGRATIONS.md. Consider splitting this into multiple deployments."
          fi

          echo -e "$REPORT" > destructive-migration-report.md
          cat destructive-migration-report.md

          if [ "$DESTRUCTIVE_FOUND" = true ]; then
            echo "has_destructive=true" >> $GITHUB_OUTPUT
          else
            echo "has_destructive=false" >> $GITHUB_OUTPUT
          fi

      - name: Comment destructive migration report on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('apps/backend/destructive-migration-report.md', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: report
            });

      - name: Fail CI for destructive migrations (soft)
        if: steps.destructive_check.outputs.has_destructive == 'true'
        run: |
          echo "⚠️ Destructive migration detected. Review the report above."
          echo "This is a soft failure — the PR can still merge with maintainer approval."
          exit 1
```

### 4.2 Destructive Operations List

The following operations are flagged as potentially destructive and require explicit review:

| Operation | Risk Level | Expand/Contract Alternative |
|-----------|-----------|---------------------------|
| `DROP TABLE` | 🔴 Critical | Deprecate table, wait N cycles, then drop |
| `DROP COLUMN` | 🔴 Critical | Expand/Contract: add new column, migrate, drop old |
| `ALTER COLUMN ... DROP NOT NULL` | 🟡 Medium | Usually safe, but verify no code depends on non-null |
| `ALTER COLUMN ... SET NOT NULL` | 🟡 Medium | Requires backfill first; may lock table |
| `DROP INDEX` | 🟡 Medium | Don't drop until no queries use it |
| `RENAME COLUMN` | 🟡 Medium | Expand/Contract: add new name, migrate, drop old |
| `RENAME TABLE` | 🔴 Critical | Expand/Contract: create new table, migrate, drop old |
| `TRUNCATE` | 🔴 Critical | Never truncate production data |
| `ALTER TABLE ... SET DEFAULT` | 🟢 Low | Safe if value matches existing data |
| Adding FK constraint | 🟡 Medium | Use `NOT VALID` then `VALIDATE CONSTRAINT` |

---

## 5. Related Documentation

- [Database Schema](./database-schema.md) — Full schema reference
- [Migration CI/CD](./database-migrations-cicd.md) — Automated pipeline
- [Migration Scripts](../scripts/backup/database-backup.sh) — Backup procedures
- [Deployment Runbook](./deployment-runbook.md) — Production deployment steps
- [Disaster Recovery](./disaster-recovery.md) — Recovery procedures