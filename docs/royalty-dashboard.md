# RoyaltyDashboard Chart/Fetch Isolation (contracts/royalty_distribution)

Design spec for issue #949. Tracked as future work — `RoyaltyDashboard` and
`contracts/royalty_distribution` do not exist in the codebase yet. This
documents the split between data fetching and presentation to build the
dashboard with from the start.

## Problem

A dashboard that fetches/polls royalty data and renders its chart in the
same component can't be tested or reused independently — the chart can't
be rendered with fixture data, and the fetching/polling logic can't be
tested without mounting a chart.

## Target structure

```
components/RoyaltyDashboard/
  RoyaltyDashboard.tsx       # composes hook + chart, no fetch logic itself
  useRoyaltyHistory.ts       # data fetching/polling hook
  RoyaltyChart.tsx           # purely presentational
```

## `useRoyaltyHistory.ts`

Owns all network access and polling; returns aggregated series data and
status, nothing chart-specific:

```ts
function useRoyaltyHistory(contractAddress: string, pollIntervalMs = 30_000) {
  // fetch + setInterval/poll internally
  return { history: RoyaltyPoint[], status: 'loading' | 'error' | 'ready', error?: string };
}
```

## `RoyaltyChart.tsx`

Takes `history` as a prop and renders it — no `fetch`, no `useEffect` tied
to the network, so it can be rendered directly with fixture data:

```ts
function RoyaltyChart({ history }: { history: RoyaltyPoint[] }) {
  // pure rendering
}
```

## `RoyaltyDashboard.tsx`

```ts
function RoyaltyDashboard({ contractAddress }: { contractAddress: string }) {
  const { history, status } = useRoyaltyHistory(contractAddress);
  if (status === 'loading') return <Loading />;
  if (status === 'error') return <ErrorState />;
  return <RoyaltyChart history={history} />;
}
```

## Acceptance criteria mapping

- "Fetching/polling isolated in hook" → `useRoyaltyHistory.ts`.
- "Chart component has no network calls" → `RoyaltyChart.tsx` takes
  `history` as a prop only.
- Code review / CI gates apply once implementation lands.
