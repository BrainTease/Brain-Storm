# Snapshot Tests Documentation

## Overview

This document describes the snapshot tests for the Brain-Storm design-system UI components.

## Files

- `snapshots.test.tsx` — Original snapshots covering Button, Badge, Spinner, Card, ProgressBar, Modal, CircularProgress
- `snapshots-extended.test.tsx` — Extended snapshots covering Input, Select, Checkbox, RadioGroup, Breadcrumb, DataGrid, Skeleton, ErrorBoundary, BadgeDisplay, TokenBalance

## Running Snapshot Tests

```bash
# Run all frontend tests (includes snapshots)
npm test --workspace=apps/frontend

# Run only snapshot tests
npx vitest run src/__tests__/components/ui/snapshots

# Run in watch mode during development
npx vitest src/__tests__/components/ui/snapshots
```

## Updating Snapshots

When you intentionally change a component's rendering output:

```bash
# Update all snapshots
npx vitest run --update

# Update only the extended snapshots
npx vitest run src/__tests__/components/ui/snapshots-extended --update
```

**Important:** Only update snapshots after reviewing the diff to confirm the changes are intentional and correct. Never update snapshots blindly.

## When to Update Snapshots

Update snapshots when:

1. A component's visual output intentionally changes (new styling, layout changes)
2. A new variant or prop is added to a component
3. Accessibility attributes are intentionally modified
4. Component structure changes for valid reasons

Do NOT update snapshots when:

1. You haven't changed the component code
2. The snapshot diff shows unexpected changes
3. You're unsure why the snapshot changed — investigate first

## Snapshot Storage

Vitest stores snapshots in `__snapshots__/` directories adjacent to the test files:

```
apps/frontend/src/__tests__/components/ui/__snapshots__/
  snapshots.test.tsx.snap
  snapshots-extended.test.tsx.snap
```

## Determinism

All snapshots use deterministic rendering:

- No `Date.now()` or `Math.random()` in rendered output
- Mocked external dependencies (next/navigation, next/link, @sentry/nextjs)
- Fixed test data with known values
- No time-dependent animations (animation="none" or stable animation classes)

## Component Coverage

### Original Snapshots (7 components, 39 snapshots)
| Component | Snapshots |
|-----------|-----------|
| Button | 7 |
| Badge | 5 |
| Spinner | 4 |
| Card | 3 |
| ProgressBar | 6 |
| Modal | 8 |
| CircularProgress | 6 |

### Extended Snapshots (10 components, 48+ snapshots)
| Component | Snapshots |
|-----------|-----------|
| Input (TextInput) | 7 |
| Select (SelectInput) | 4 |
| Checkbox | 5 |
| RadioGroup | 5 |
| Breadcrumb | 3 |
| DataGrid | 3 |
| Skeleton | 7 |
| ErrorBoundary | 3 |
| BadgeDisplay | 9 |
| TokenBalance | 8 |
