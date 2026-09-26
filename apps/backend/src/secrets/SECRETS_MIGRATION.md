# Direct process.env Secret Access Audit

## What was implemented

- `SecretsAccessor` (`secrets.accessor.ts`): a thin, injectable wrapper around
  `ConfigService` for reading secret-shaped environment variables, so secret
  reads go through one auditable choke point instead of scattered
  `process.env.X` reads.
- Migrated `ReadReplicaService` (`src/database/read-replica.service.ts`) off
  `process.env.DATABASE_REPLICA_HOST` onto `SecretsAccessor.get()` as the
  reference migration.
- Registered `SecretsAccessor` as a provider/export of `SecretRotationModule`
  so any module importing it can inject `SecretsAccessor`.
- Added a `no-restricted-syntax` ESLint rule in `apps/backend/.eslintrc.js`
  that flags `process.env.<NAME>` reads where `<NAME>` matches
  `/(SECRET|TOKEN|PASSWORD|KEY|CREDENTIAL|PRIVATE)/i`, with an override
  disabling it under `src/secrets/**` and `src/config/**`.
- Added `secrets.accessor.spec.ts` unit tests.

## Audit results (grep for `process.env.` outside config/secrets)

```
apps/backend/src/data-source.ts
apps/backend/src/instrument.ts
apps/backend/src/tracing.ts
apps/backend/src/database/seed.ts
apps/backend/src/database/db-pool.config.ts
apps/backend/src/database/read-replica.service.ts   -> migrated in this change
apps/backend/src/stellar/stellar-indexer.service.ts
apps/backend/src/stellar/stellar.service.soroban-spec.ts
apps/backend/src/common/logger/structured-logger.service.ts
apps/backend/src/common/filters/global-exception.filter.ts
apps/backend/src/gateway/gateway.service.ts
```

Of these, most reads are non-secret operational config (pool sizes, timeouts,
log level, app version, indexer catchup flag) rather than credentials/tokens,
so they are intentionally left on `process.env`/`ConfigService` and are out of
scope for the secrets accessor. `data-source.ts`, `instrument.ts`, and
`tracing.ts` run at process bootstrap before Nest's DI container exists, so
they cannot use an injectable service and are excluded by design — the lint
rule's selector only fires on names matching the secret-keyword pattern
above, so these files are unaffected unless they read an actual credential.

Any of the remaining files found to read an actual credential/token directly
should be migrated to `SecretsAccessor` the same way `ReadReplicaService` was
in this change; the lint rule will now catch new violations matching the
secret-keyword pattern at lint time.

## Acceptance criteria status

- [x] Lint rule enforced (`no-restricted-syntax` in `apps/backend/.eslintrc.js`)
- [x] Reference migration completed (`ReadReplicaService`)
- [ ] Full migration of every remaining direct `process.env` secret read —
      requires per-file confirmation of which values are true secrets vs.
      operational config; tracked above for follow-up.
- [x] Tested (unit) — `secrets.accessor.spec.ts`
- [ ] Code review
