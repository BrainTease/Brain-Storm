# Frontend

This package contains the Next.js frontend for the application.

## Architecture patterns

This app follows a few conventions that keep the codebase maintainable and testable. Please follow them when adding or changing code.

### 1. Wallet logic: the `useWallet` hook / service

All Stellar wallet SDK calls are isolated behind a small, mockable service interface. Components never import the Stellar SDK directly — they consume the `useWallet` hook, which wraps a `WalletService` adapter.

- **`WalletService`** — the interface describing the wallet operations (`connect`, `disconnect`, `signTransaction`, `getPublicKey`, etc.).
- **`StellarWalletService`** — the default adapter that talks to the Stellar SDK.
- **`useWallet()`** — the React hook that exposes wallet state (`address`, `connected`, `connecting`, `error`) and actions (`connect`, `disconnect`, `signTransaction`).

#### Adapter injection example

The service is injectable, so tests and stories can supply a mock instead of hitting the real SDK:

```tsx
import { WalletProvider } from '@/hooks/useWallet';
import type { WalletService } from '@/services/wallet';

// A mock adapter for tests / local development
const mockWalletService: WalletService = {
  connect: async () => 'GABC...',
  disconnect: async () => {},
  getPublicKey: async () => 'GABC...',
  signTransaction: async (xdr) => xdr,
};

export function App() {
  return (
    <WalletProvider service={mockWalletService}>
      <WalletButton />
    </WalletProvider>
  );
}
```

In components, always use the hook:

```tsx
import { useWallet } from '@/hooks/useWallet';

function WalletButton() {
  const { connected, address, connect, disconnect } = useWallet();
  return connected ? (
    <button onClick={disconnect}>{address}</button>
  ) : (
    <button onClick={connect}>Connect wallet</button>
  );
}
```

**Rules**

- Do not import `@stellar/stellar-sdk` (or any wallet SDK) inside components. Put SDK calls in the service adapter.
- Add new wallet operations to the `WalletService` interface and implement them in the adapter, then surface them through `useWallet`.
- In tests, inject a mock `WalletService` rather than mocking the SDK.

### 2. Design tokens and theming

Visual values (colors, spacing, radii, font sizes, shadows, z-index) live in a single theme/token file (`src/theme`). Components reference tokens instead of hard-coded values.

- **No inline styles** for anything that belongs to the design system. Use the token-based styling utilities / CSS variables.
- **No magic values.** Replace raw values like `#3b82f6`, `16px`, or `z-index: 9999` with the corresponding token (e.g. `colors.primary`, `space[4]`, `zIndex.modal`).
- **No duplicated CSS.** If a style is reused, extract it into a shared component or a token-driven utility rather than copy-pasting rules.

```tsx
import { colors, space } from '@/theme';

// Good: token-driven
<div style={{ color: colors.text.primary, padding: space[4] }} />

// Avoid: magic values
<div style={{ color: '#111827', padding: '16px' }} />
```

When you need a new value, add it to the theme first, then use it.

### 3. Centralized config, env access and feature flags

All environment access and configuration lives in a single config module (`src/config`). Components must **not** read `process.env` directly. Values are validated with safe fallbacks and exposed as typed fields:

```tsx
import { getConfig, getFeatureFlags } from '@/config';

const { apiUrl, stellarNetwork, siteUrl } = getConfig();

if (getFeatureFlags().wallet) {
  // ...
}
```

**Rules**

- Only `src/config/env.ts` reads `process.env`, using static `process.env.KEY` expressions so Next.js can inline them. Everything else calls `getConfig()` from `@/config`.
- Add new public variables to `src/config/public-env.json` (the shared key list used by `next.config.js`), then expose them as a typed field in `src/config/index.ts` and document them in `.env.example`.
- Feature flags come from `getFeatureFlags()` and default to a safe value when the env var is absent.
- In tests, use `overrideConfig()` / `resetConfig()` instead of mutating the global environment.
- `npm run check:env` and the ESLint `no-restricted-syntax` rule fail on any new direct access outside the allowlisted config, test and build-tool files.

### 4. Loading, empty and skeleton states

Use the shared `Skeleton` and `EmptyState` components for loading and empty states instead of ad-hoc spinners or placeholder markup.

```tsx
import { Skeleton } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';

function TransactionList({ loading, items }) {
  if (loading) {
    return (
      <div>
        <Skeleton width="100%" height={48} />
        <Skeleton width="100%" height={48} />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Transactions will appear here once you make one."
      />
    );
  }

  return <ul>{/* ... */}</ul>;
}
```

**Rules**

- Use `Skeleton` for loading placeholders and `EmptyState` for zero-data states.
- Keep these components presentational and reusable; pass content via props.
- Prefer them over one-off loading/empty markup so states look and behave consistently.

## Testing

Run the unit and smoke render tests from `apps/frontend`:

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# A single file
npm test -- path/to/file.test.tsx
```

- **Unit tests** cover hooks, services and utilities. For wallet logic, inject a mock `WalletService` into `WalletProvider` (see above) — never call the real SDK in tests.
- **Smoke render tests** render components (including `Skeleton` and `EmptyState`) to verify they mount without errors and render expected content.
- When you touch a component, update or add tests for the affected behavior.
