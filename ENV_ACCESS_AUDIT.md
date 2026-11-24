# Environment access audit (#1551)

Baseline recorded on clean `main` at `0bcb2b8` with the script added by this change:

```bash
npm run check:env
```

## Baseline violations

18 direct `process.env` reads were found in application code outside a config
module (15 files). All have been migrated to typed config accessors:

| Area     | File                                                                   | Reads                                                        |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| Frontend | `apps/frontend/src/app/courses/[id]/page.tsx`                          | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`                |
| Frontend | `apps/frontend/src/app/layout.tsx`                                     | `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_API_URL`                |
| Frontend | `apps/frontend/src/app/profile/WalletSection.tsx`                      | `NEXT_PUBLIC_STELLAR_NETWORK`                                |
| Frontend | `apps/frontend/src/app/[locale]/profile/WalletSection.tsx`             | `NEXT_PUBLIC_STELLAR_NETWORK`                                |
| Frontend | `apps/frontend/src/components/royalties/RoyaltyTransactionHistory.tsx` | `NEXT_PUBLIC_STELLAR_NETWORK`                                |
| Frontend | `apps/frontend/src/components/ui/ErrorBoundary.tsx`                    | `NODE_ENV`                                                   |
| Frontend | `apps/frontend/src/components/wallet/TransactionHistory.tsx`           | `NEXT_PUBLIC_STELLAR_NETWORK`                                |
| Frontend | `apps/frontend/src/hooks/useNotifications.ts`                          | `NEXT_PUBLIC_API_URL`                                        |
| Frontend | `apps/frontend/src/hooks/useProgressSocket.ts`                         | `NEXT_PUBLIC_API_URL`                                        |
| Frontend | `apps/frontend/src/hooks/useProtocolMetrics.ts`                        | `NEXT_PUBLIC_API_URL`                                        |
| Frontend | `apps/frontend/src/lib/api.ts`                                         | `NEXT_PUBLIC_API_URL`                                        |
| Frontend | `apps/frontend/src/lib/wallet/network.ts`                              | `NEXT_PUBLIC_STELLAR_NETWORK`                                |
| Frontend | `apps/frontend/middleware.ts`                                          | `NODE_ENV`                                                   |
| Package  | `packages/api/src/index.ts`                                            | `PORT`                                                       |
| Package  | `packages/app/src/lib/transactions.ts`                                 | `NEXT_PUBLIC_STELLAR_NETWORK`, `NEXT_PUBLIC_BST_CONTRACT_ID` |

The three Sentry config files (`sentry.client.config.ts`,
`sentry.server.config.ts`, `sentry.edge.config.ts`) also read environment
variables directly. They are classified as build-tool configuration and are
exempt from enforcement, but were migrated to `getConfig()` as well.

## Current result

```text
Type-safe env/config access audit (#1551)
Scanned 1777 file(s).
No direct process.env access in application code. ✓
```

`npm run check:env` scans `apps/frontend`, `apps/backend/src`, and `packages`.
The `--staged` variant is wired into `.husky/pre-commit`; ESLint
`no-restricted-syntax` rules mirror the same policy in the root and frontend
configs.

## Justified exceptions

The following reads remain allowed and are intentionally excluded:

- **Config modules** (`src/config/**` in each app/package): the single place
  that may read `process.env`. The frontend uses static `process.env.KEY`
  expressions so Next.js can inline public values at build time.
- **Tests and fixtures** (`__tests__/`, `tests/`, `e2e/`, `*.test.*`,
  `*.spec.*`): they deliberately vary env values per case.
- **Build/CLI tooling** (`*.config.js|ts`, `.eslintrc.js`, `scripts/`): runs
  before application config exists and owns variables such as `CI`,
  `ANALYZE`, and `PLAYWRIGHT_BASE_URL`.
- **Backend non-secret operational reads**: the existing backend ESLint rule
  only blocks secret-shaped names outside `src/config`/`src/secrets`; new code
  should still use `ConfigService` or `src/config/env.ts`.

Details are also documented in `docs/environment-variables.md`.
