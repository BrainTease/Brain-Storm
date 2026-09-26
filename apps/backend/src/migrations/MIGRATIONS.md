# Migration Policy

## Why this exists

Before this policy, the backend had accumulated 16 individual migration
files, 13 of which were small, sequential, additive changes made during
early development (new tables, single-column additions) with no interaction
with any already-deployed schema. That made fresh environment setup slower
than necessary and made it harder to see the actual shape of the schema at a
glance.

## What changed

The 13 pre-1.0 migrations from `1700000000000-InitialMigration` through
`1730000000000-AddDatabaseIndexes` were squashed into a single
`1700000000000-InitialSchemaBaseline` migration. The squashed migration's
`up()`/`down()` bodies are a straight concatenation of the original
migrations' bodies in their original order, so a fresh database ends up with
an identical schema. This is safe specifically because:

- TypeORM records completed migrations by class name in the `migrations`
  table. Environments that already ran the 13 originals will simply never
  see or run the new consolidated file (it isn't present anymore), and they
  are not touched by this change.
- Environments that have not yet run any migrations (fresh dev setups, fresh
  CI databases) get the exact same resulting schema, just via one file
  instead of thirteen.

`1750000000000-AddAuditHashChain`, `1760000000000-AddSoftDeleteAuditColumns`,
and `1760000000001-AddPerformanceIndexes` were **not** squashed — they are
recent enough that they may already be applied against a real environment,
so squashing them carries real risk for no real benefit.

## Known gap (follow-up, not fixed in this change)

`data-source.ts` runs with `synchronize: false` (used for the CLI / production
migration path), but `app.module.ts` enables `synchronize: true` outside of
`production`. As a result, several entities — including `cohorts`,
`enrollments`, `audit_logs`, and `stellar_transaction_logs` — have never had
an explicit "create table" migration; their tables only exist in dev/test
because `synchronize` creates them on the fly. `AddDatabaseIndexes` (now part
of the baseline) already assumes those tables exist. This means a *true*
fresh production database (`synchronize: false`, migrations only) is
currently missing those tables entirely.

This is a pre-existing gap, not something introduced by the squash — the
squash preserves it byte-for-byte. It should be tracked as its own follow-up:
generate proper migrations for `cohorts`, `enrollments`, `audit_logs`, and
`stellar_transaction_logs` from their current entity definitions, and add a
CI check that fails the build if `synchronize` schema drift is detected
against the latest migrated schema.

## Policy going forward

1. **One migration per schema-affecting PR.** Do not bundle unrelated schema
   changes into a single migration file.
2. **Every entity change ships with a migration.** Because `synchronize` is
   disabled in production, an entity change with no matching migration is a
   production bug, not a "will do later."
3. **No squashing once a migration has shipped to a real environment**
   (staging or production). Squashing is only safe for migrations that have
   only ever run in ephemeral dev/CI databases. When in doubt, don't squash —
   leave the migration as its own file.
4. **Prefer additive, backward-compatible changes** (new nullable columns,
   new tables) over destructive ones in the same release a feature ships in,
   so a rollback of the application code doesn't require a rollback of the
   schema.
5. **Name migrations descriptively** (`AddX`, `AddXToY`, `DropX`) and let
   TypeORM's timestamp prefix — not a manually incremented counter — order
   them.
6. **Verify fresh-database setup** (`npm run migration:run` against an empty
   database) as part of the PR that adds a migration, and again in CI.
