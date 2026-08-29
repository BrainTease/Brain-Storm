# ReputationScore Dead Code Cleanup (contracts/reputation v2)

Design spec for issue #951. Tracked as future work — no `ReputationScore`
component tree or `contracts/reputation` exist in the codebase yet. This
documents the cleanup approach to apply once the v2 component and its
legacy predecessor both exist.

## Problem

A pre-v2 reputation scoring UI is expected to keep shipping alongside the
v2 rewrite, guarded behind feature flags that are no longer read anywhere
meaningful. Left alone, the bundle carries both implementations and the
flag branches indefinitely.

## Approach

1. **Identify unreferenced components.** Run an unused-exports scan (e.g.
   `npx ts-prune` or `eslint-plugin-unused-imports`) scoped to the
   `ReputationScore` component tree once it exists, to get a concrete list
   of files with no live import path from `app/` or `components/`.
2. **Remove dead branches and flags.** For each feature flag gating legacy
   vs. v2 rendering, confirm the flag is permanently on (or off) in every
   environment config, then delete the losing branch and the flag
   definition itself — not just the read site.
3. **Verify via build.** A clean `next build` (or equivalent) with zero
   unused-export warnings is the acceptance signal; a broken import from a
   deleted file will fail the build rather than fail silently.

## Acceptance criteria mapping

- "Unused files deleted" → output of the unused-exports scan, applied.
- "Build and lint pass with zero unused-export warnings" → build/lint gate.
- Code review / CI gates apply once implementation lands.
