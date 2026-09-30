# Quality Tests

Cross-cutting invariants that **no off-the-shelf tool** can enforce.

## Scope — what belongs here

| Test | Invariant |
|------|-----------|
| `eslint-disables.test.ts` | Every `eslint-disable` directive carries a `-- justification` |
| `duplicate-types.test.ts` | Canonical domain types live only in `packages/types` |
| `sdk-contract-abi-drift.test.ts` | SDK TypeScript types match Soroban contract Rust signatures |
| `sdk-contract-staleness-regression.test.ts` | The drift detector actually fires on injected mismatch |

## Boundaries — what does NOT belong here

The following concerns are enforced by **dedicated tooling**. Do not re-add
tests for them in this directory:

| Concern | Enforced by | Where configured |
|---------|-------------|------------------|
| Lint rules (unused vars, imports, style) | ESLint | `.eslintrc.js` |
| Import ordering | ESLint (`simple-import-sort`) | `.eslintrc.js` |
| Code formatting | Prettier | `.prettierrc` + CI `format:check` |
| Type checking | `tsc --noEmit` | `tsconfig.json` + CI |
| Dead code / unused exports | ESLint + Sonar | `.eslintrc.js`, `sonar-project.properties` |
| Complexity / coverage thresholds | Sonar | `sonar-project.properties` |
| Mutation thresholds | Stryker | `stryker.conf.js` |

If a check is already enforced by one of the tools above, do **not** duplicate
it here. Instead, update the tool's configuration.

## Running

```bash
npx vitest run __tests__/quality
