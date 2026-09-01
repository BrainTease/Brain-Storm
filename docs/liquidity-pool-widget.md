# LiquidityPoolWidget State Management

Design spec for issue #950. Tracked as future work — `LiquidityPoolWidget`
does not exist in the codebase yet. This documents the state-management
shape to build it with from the start, rather than a conversion of existing
`useState` chains.

## Problem

Ad-hoc `useState` calls for loading/error/data tend to drift out of sync
with each other (e.g. `loading: false` and `error: null` and `data: null`
all true at once), producing UI states that shouldn't be reachable. A
reducer with a closed set of typed actions avoids that by construction.

## State shape

```ts
type PoolState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; pool: LiquidityPool };

type PoolAction =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; pool: LiquidityPool }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'RESET' };
```

Modeling `status` as a discriminated union (rather than separate booleans)
means each branch of the reducer returns exactly one valid state, and
consuming components switch on `state.status` instead of combining flags.

## Reducer

```ts
function poolReducer(state: PoolState, action: PoolAction): PoolState {
  switch (action.type) {
    case 'FETCH_START':
      return { status: 'loading' };
    case 'FETCH_SUCCESS':
      return { status: 'success', pool: action.pool };
    case 'FETCH_ERROR':
      return { status: 'error', message: action.message };
    case 'RESET':
      return { status: 'idle' };
  }
}
```

## Acceptance criteria mapping

- "Reducer replaces scattered useState calls" → `poolReducer` above, wired
  via `useReducer(poolReducer, { status: 'idle' })` in the widget.
- "All states (idle/loading/error/success) covered" → the four `PoolState`
  variants are exhaustive by construction (TS will flag an unhandled
  `status` in consuming switches).
- Code review / CI gates apply once implementation lands.
