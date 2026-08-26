# Dispute Timeline Component (contracts/dispute)

Design spec for issue #952. Tracked as future work — `DisputeResolution` and
`contracts/dispute` do not exist in the codebase yet, so this documents the
target modular structure for when the feature is built, rather than a
refactor of existing code.

## Problem

A single dispute timeline component would naturally grow into one large
switch statement over dispute state (`filed`, `evidence`, `arbitration`,
`resolved`), mixing layout, icon/label lookup, and per-state rendering logic
in one file. This spec defines the structure to build it in from the start
so that never happens.

## Target file layout

```
components/DisputeTimeline/
  index.tsx                 # orchestrator: picks the state component to render
  FiledState.tsx
  EvidenceState.tsx
  ArbitrationState.tsx
  ResolvedState.tsx
  stateConfig.ts             # icon/label mapping, keyed by state
  types.ts                   # DisputeState union, shared props
```

## `stateConfig.ts`

A single config object maps each `DisputeState` to its display metadata, so
adding a new state means adding one entry instead of a new switch branch:

```ts
export const DISPUTE_STATE_CONFIG: Record<DisputeState, {
  icon: IconComponent;
  label: string;
  description: string;
}> = {
  filed: { icon: FileIcon, label: 'Filed', description: '...' },
  evidence: { icon: FolderIcon, label: 'Evidence Submitted', description: '...' },
  arbitration: { icon: GavelIcon, label: 'In Arbitration', description: '...' },
  resolved: { icon: CheckIcon, label: 'Resolved', description: '...' },
};
```

## `index.tsx`

Looks up the state component by key instead of branching:

```ts
const STATE_COMPONENTS: Record<DisputeState, React.ComponentType<StateProps>> = {
  filed: FiledState,
  evidence: EvidenceState,
  arbitration: ArbitrationState,
  resolved: ResolvedState,
};

export function DisputeTimeline({ dispute }: { dispute: Dispute }) {
  const StateComponent = STATE_COMPONENTS[dispute.state];
  return <StateComponent dispute={dispute} config={DISPUTE_STATE_CONFIG[dispute.state]} />;
}
```

Each `*State.tsx` component receives the dispute and its resolved config
entry, and owns only the layout specific to that state (e.g. `EvidenceState`
renders the evidence list, `ArbitrationState` renders arbitrator info).

## Acceptance criteria mapping

- "Each dispute state has its own component" → the four `*State.tsx` files.
- "Config-driven icon/label mapping" → `stateConfig.ts` + `STATE_COMPONENTS`
  lookup replacing the switch.
- Code review / CI gates apply once implementation lands.
