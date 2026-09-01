# E2E Wallet-Connect-to-Purchase Journey (#1020)

## Overview

`apps/frontend/e2e/wallet-connect-purchase-journey.spec.ts` contains the full
Playwright end-to-end test for the critical path:

> **Connect wallet → Browse marketplace → Purchase a course → Confirmation**

All API calls and wallet interactions are intercepted at the network layer, so
the suite runs offline and deterministically without a live Stellar node or a
real Freighter extension.

---

## Test Cases

| # | Scenario |
|---|---|
| 1 | Wallet connect button is visible; clicking it shows the connected state |
| 2 | Full happy path: connect → browse → purchase → success confirmation |
| 3 | Freighter not installed → install prompt is shown |
| 4 | Insufficient BST balance → purchase blocked with error message |
| 5 | User rejects signing in Freighter → rejection error displayed |
| 6 | Order API returns 500 → generic error message shown |
| 7 | Dashboard shows wallet public key and BST balance after connecting |

---

## Local Setup

### Prerequisites

```bash
# Install Node dependencies (from repo root)
npm install

# Install Playwright browsers (one-time)
cd apps/frontend
npx playwright install --with-deps chromium
```

### Running the Tests

```bash
# Single run (requires dev server on port 3001)
cd apps/frontend
npx playwright test wallet-connect-purchase-journey

# With 3 consecutive retries to verify no flakiness
npx playwright test wallet-connect-purchase-journey --retries=2

# Headed mode (see the browser)
npx playwright test wallet-connect-purchase-journey --headed

# CI mode (no dev server auto-start — set PLAYWRIGHT_BASE_URL first)
PLAYWRIGHT_BASE_URL=http://localhost:3001 npx playwright test wallet-connect-purchase-journey
```

The Playwright config (`apps/frontend/playwright.config.ts`) will
automatically start the Next.js dev server when running locally if it isn't
already running.

---

## Mock Wallet

Tests use the `mockWallet` helper from
`apps/frontend/e2e/fixtures/wallet-mock.ts`, which injects a fake Freighter
API into the browser context before any navigation.  The default test wallet
keypair is:

```
Public key : GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7
Network    : TESTNET
```

**Never use the test secret key in a production environment.**

---

## API Mocks

All backend API calls are intercepted via `page.route()` in the
`setupApiRoutes` helper.  Routes mocked:

| Endpoint | Mock |
|---|---|
| `GET /v1/courses` | Returns 1 sample course |
| `GET /v1/courses/course-stellar-intro` | Returns course detail |
| `GET /v1/users/*/token-balance` | Returns `{ balance: '500' }` |
| `GET /v1/stellar/balance/*` | Returns BST + native balance |
| `POST /v1/orders` | Returns confirmed order |
| `POST /v1/enrollments` | Returns active enrollment |
| `GET /v1/users/**` | Returns mock user profile |

Individual tests override specific routes to simulate error conditions.

---

## CI Integration

The `playwright.yml` workflow runs all E2E tests on every PR.  The new spec
is picked up automatically because it lives in `apps/frontend/e2e/` and
matches the `testDir: './e2e'` setting in `playwright.config.ts`.

The workflow uses `retries: 2` in CI mode, ensuring each test must pass
reliably across 3 consecutive attempts before the suite is considered green.
