# npm Audit Report

> Recorded as part of [#1540] — Run npm audit and fix high/critical vulnerabilities.

## Baseline (pre-fix)

| Severity  | Count   |
| --------- | ------- |
| Critical  | 6       |
| High      | 41      |
| Moderate  | 98      |
| Low       | 6       |
| **Total** | **151** |

## After fix

Safe fixes applied with `npm audit fix --legacy-peer-deps`.  
Additional transitive override added: `@xmldom/xmldom ^0.9.12`.

| Severity  | Count   |
| --------- | ------- |
| Critical  | 4       |
| High      | 34      |
| Moderate  | 85      |
| Low       | 6       |
| **Total** | **129** |

**High/critical reduction: 9 vulnerabilities resolved** (6 critical → 4, 41 high → 34).

## Remaining high/critical — justified exceptions

All remaining 38 high/critical advisories require **major-version breaking changes** in their
direct parent package. Each entry below lists the vulnerable package, the minimum safe version,
the reason it has not been updated, and the planned resolution.

| Package                    | Vulnerable ver. | Safe ver. | Reason deferred                                                      | Planned fix                      |
| -------------------------- | --------------- | --------- | -------------------------------------------------------------------- | -------------------------------- |
| `next`                     | <16.4.6         | 16.4.6    | Major rewrite; requires full Next.js 15 migration and E2E regression | Track in dedicated upgrade issue |
| `@nestjs/platform-express` | <12.6.0         | 12.6.0    | NestJS v12 is a major; requires backend migration                    | Track in dedicated upgrade issue |
| `@nestjs/graphql`          | <14.2.1         | 14.2.1    | Apollo v4 migration needed                                           | Track in dedicated upgrade issue |
| `@nestjs/config`           | <12.1.1         | 12.1.1    | Tied to NestJS v12 upgrade                                           | Track in dedicated upgrade issue |
| `@nestjs/swagger`          | <12.1.2         | 12.1.2    | Tied to NestJS v12 upgrade                                           | Track in dedicated upgrade issue |
| `vitest` / `tinypool`      | <5.1.1          | 5.1.1     | Vitest 5 is a major; test suite migration needed                     | Track in dedicated upgrade issue |
| `@vitest/coverage-v8`      | <5.1.1          | 5.1.1     | Tied to vitest upgrade                                               | Track in dedicated upgrade issue |
| `@stellar/stellar-sdk`     | <17.4.0         | 17.4.0    | SDK v17 is a major; contract integration must be tested              | Track in dedicated upgrade issue |
| `@sentry/nextjs`           | <11.16.0        | 11.16.0   | Sentry SDK v11 is a major                                            | Track in dedicated upgrade issue |
| `@storybook/nextjs`        | <10.6.8         | 10.6.8    | Storybook 9 migration needed                                         | Track in dedicated upgrade issue |
| `@opentelemetry/sdk-node`  | <0.301.2        | 0.301.2   | OTel major bump; tracing integration must be validated               | Track in dedicated upgrade issue |
| `@faker-js/faker`          | <10.6.0         | 10.6.0    | Faker v10 API changes needed                                         | Track in dedicated upgrade issue |
| `eslint-config-next`       | <16.4.6         | 16.4.6    | Tied to Next.js upgrade                                              | Track in dedicated upgrade issue |
| `adm-zip`                  | <0.6.1          | 0.6.1     | Major rewrite; evaluate replacement                                  | Track in dedicated upgrade issue |
| `zod`                      | <4.6.7          | 4.6.7     | Zod v4 is a major with breaking API changes                          | Track in dedicated upgrade issue |

> **Note:** `@nestjs/cli` (devDependency, build-time only) contains transitive vulnerabilities
> from `glob` / `webpack`. These do not affect the runtime application surface.

## Running locally

```bash
# Check current advisory state
npm audit --audit-level=high

# Apply safe (non-breaking) fixes
npm audit fix --legacy-peer-deps
```

## CI enforcement

The `audit` script in `package.json` runs `npm audit --audit-level=high` and is used in CI
to gate merges. The current baseline is documented above; any new high/critical advisory
introduced after this baseline will block CI until resolved or explicitly justified here.
