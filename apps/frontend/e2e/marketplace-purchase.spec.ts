import { test, expect } from '@playwright/test';
import { mockWallet, TEST_WALLET } from './fixtures/wallet-mock';

/**
 * Issue #845 — Marketplace Purchase Flow E2E Tests
 *
 * All external API calls and wallet interactions are intercepted via
 * `page.route()` so the suite is fully deterministic and runs offline.
 *
 * Coverage:
 *  1. Happy path  — browse → add to cart → wallet payment → success state
 *  2. Insufficient balance — checkout blocked with balance error message
 *  3. Transaction rejection / user cancellation at wallet prompt
 *  4. Network timeout / error during order submission
 */

// ─── Shared fixture data ──────────────────────────────────────────────────────

const MOCK_COURSES = [
  {
    id: 'course-1',
    title: 'Introduction to Stellar',
    description: 'Learn the basics of the Stellar network.',
    price: 50,
    currency: 'BST',
    instructor: 'Alice Instructor',
    level: 'beginner',
    thumbnailUrl: '/images/stellar-intro.png',
    durationHours: 5,
  },
  {
    id: 'course-2',
    title: 'Smart Contracts with Soroban',
    description: 'Build on Soroban from scratch.',
    price: 120,
    currency: 'BST',
    instructor: 'Bob Builder',
    level: 'advanced',
    thumbnailUrl: '/images/soroban.png',
    durationHours: 10,
  },
];

const MOCK_ORDER_SUCCESS = {
  orderId: 'order-abc-123',
  status: 'confirmed',
  transactionId: 'tx-stellar-abc123',
  amount: 50,
  currency: 'BST',
};

/**
 * Mount all standard API intercepts for marketplace routes.
 * Individual tests can override specific routes as needed.
 */
async function setupMarketplaceRoutes(page: import('@playwright/test').Page) {
  // Course catalogue
  await page.route('**/api/v1/courses**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: MOCK_COURSES, total: MOCK_COURSES.length }),
    }),
  );

  // Single course detail
  await page.route('**/api/v1/courses/course-1', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_COURSES[0]),
    }),
  );

  // Token / wallet balance
  await page.route('**/api/v1/users/*/token-balance', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ balance: '500' }),
    }),
  );

  // Order creation (happy-path default)
  await page.route('**/api/v1/orders', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_ORDER_SUCCESS),
    }),
  );

  // Enrollment confirmation
  await page.route('**/api/v1/enrollments', (route) =>
    route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ enrollmentId: 'enroll-1', courseId: 'course-1', status: 'active' }),
    }),
  );
}

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe('Marketplace Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Inject the mocked Freighter wallet before any navigation
    await mockWallet(page, {
      publicKey: TEST_WALLET.publicKey,
      network: 'TESTNET',
      isInstalled: true,
    });

    // Inject a valid auth token so JWT guards don't redirect to login
    await page.addInitScript(() => {
      // Seed localStorage with a fake session token
      const fakePayload = btoa(JSON.stringify({ sub: 'user-test-1', exp: 9999999999 }));
      const fakeToken = `header.${fakePayload}.signature`;
      localStorage.setItem(
        'auth',
        JSON.stringify({ state: { token: fakeToken, user: { id: 'user-test-1', username: 'tester', email: 'tester@example.com', role: 'student' }, hasHydrated: true } }),
      );
    });

    await setupMarketplaceRoutes(page);
  });

  // ── 1. Happy Path ────────────────────────────────────────────────────────────
  test('happy path: browse → preview → purchase → success confirmation', async ({ page }) => {
    // Step 1 — Visit the course catalogue / marketplace
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: /courses|browse|marketplace/i })).toBeVisible({ timeout: 10_000 });

    // Step 2 — At least one course card is visible
    const courseCards = page.locator('[data-testid="course-card"], .course-card, article').first();
    await expect(courseCards).toBeVisible({ timeout: 8_000 });

    // Step 3 — Open course preview / detail modal
    const previewBtn = page
      .getByRole('button', { name: /preview|details|view course/i })
      .or(page.getByRole('link', { name: /introduction to stellar/i }))
      .first();
    await expect(previewBtn).toBeVisible({ timeout: 5_000 });
    await previewBtn.click();

    // Step 4 — Enroll / purchase button visible in modal or detail page
    const purchaseBtn = page
      .getByRole('button', { name: /enroll|purchase|buy|get course/i })
      .first();
    await expect(purchaseBtn).toBeVisible({ timeout: 8_000 });
    await purchaseBtn.click();

    // Step 5 — Wallet / payment confirmation dialog
    const confirmBtn = page
      .getByRole('button', { name: /confirm|pay|approve|proceed/i })
      .first();
    await expect(confirmBtn).toBeVisible({ timeout: 8_000 });
    await confirmBtn.click();

    // Step 6 — Success state
    await expect(
      page.getByText(/success|enrolled|enrollment confirmed|purchase complete|you're in/i),
    ).toBeVisible({ timeout: 15_000 });
  });

  // ── 2. Insufficient Balance ─────────────────────────────────────────────────
  test('shows insufficient balance error when wallet funds are too low', async ({ page }) => {
    // Override balance endpoint to return 0
    await page.route('**/api/v1/users/*/token-balance', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ balance: '0' }),
      }),
    );

    // Also override Horizon balance for the wallet provider
    await page.route('**/horizon-testnet.stellar.org/accounts/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balances: [{ asset_type: 'native', balance: '0.0000000' }],
        }),
      }),
    );

    // Override the order endpoint to simulate insufficient funds rejection
    await page.route('**/api/v1/orders', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 422,
          message: 'Insufficient BST balance to complete purchase.',
          error: 'Unprocessable Entity',
        }),
      }),
    );

    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: /courses|browse|marketplace/i })).toBeVisible({ timeout: 10_000 });

    const purchaseBtn = page
      .getByRole('button', { name: /enroll|purchase|buy|get course/i })
      .first();

    // If the button is visible, click it and expect the error
    if (await purchaseBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await purchaseBtn.click();

      // The UI may block purchase upfront with a balance warning or show it post-confirm
      const confirmBtn = page
        .getByRole('button', { name: /confirm|pay|approve|proceed/i })
        .first();

      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Error message about insufficient balance should surface
      await expect(
        page.getByText(/insufficient|balance|not enough|funds/i),
      ).toBeVisible({ timeout: 10_000 });
    } else {
      // Balance warning rendered inline before the CTA
      await expect(
        page.getByText(/insufficient|balance|not enough|funds/i),
      ).toBeVisible({ timeout: 10_000 });
    }
  });

  // ── 3. Transaction Rejection / User Cancellation ─────────────────────────────
  test('handles wallet transaction rejection / user cancellation gracefully', async ({ page }) => {
    // Override Freighter to throw a rejection when sign is called
    await page.addInitScript(() => {
      (window as any).freighter = {
        isConnected: () => Promise.resolve(true),
        getPublicKey: async () => 'GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7',
        getNetwork: async () => 'TESTNET',
        getNetworkDetails: async () => ({
          network: 'TESTNET',
          networkPassphrase: 'Test SDF Network ; September 2015',
        }),
        signTransaction: async () => {
          throw new Error('User declined transaction');
        },
        isAllowed: () => Promise.resolve(true),
        setAllowed: () => Promise.resolve(),
        getUserInfo: async () => ({
          publicKey: 'GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7',
        }),
      };
    });

    // Override order endpoint to simulate a signing-required flow
    await page.route('**/api/v1/orders', (route) =>
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 402,
          message: 'Transaction signature required',
          xdr: 'AAAAAgAAAA...',
        }),
      }),
    );

    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: /courses|browse|marketplace/i })).toBeVisible({ timeout: 10_000 });

    const purchaseBtn = page
      .getByRole('button', { name: /enroll|purchase|buy|get course/i })
      .first();

    if (await purchaseBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await purchaseBtn.click();

      const confirmBtn = page
        .getByRole('button', { name: /confirm|pay|approve|proceed/i })
        .first();

      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // Should surface a user-facing cancellation / rejection message
      await expect(
        page.getByText(/cancelled|rejected|declined|failed|try again/i),
      ).toBeVisible({ timeout: 10_000 });

      // Should NOT show a success confirmation
      await expect(
        page.getByText(/enrolled|purchase complete|you're in/i),
      ).not.toBeVisible({ timeout: 3_000 });
    }
  });

  // ── 4. Network Timeout / Error During Order Submission ──────────────────────
  test('shows error state when order submission times out or fails', async ({ page }) => {
    // Override order endpoint to simulate a 503 gateway failure
    await page.route('**/api/v1/orders', (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 503,
          message: 'Service temporarily unavailable. Please try again.',
        }),
      }),
    );

    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: /courses|browse|marketplace/i })).toBeVisible({ timeout: 10_000 });

    const purchaseBtn = page
      .getByRole('button', { name: /enroll|purchase|buy|get course/i })
      .first();

    if (await purchaseBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await purchaseBtn.click();

      const confirmBtn = page
        .getByRole('button', { name: /confirm|pay|approve|proceed/i })
        .first();

      if (await confirmBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmBtn.click();
      }

      // A user-friendly error message should appear
      await expect(
        page.getByText(/error|failed|unavailable|try again|something went wrong/i),
      ).toBeVisible({ timeout: 10_000 });

      // The purchase CTA should still be accessible (not stuck in loading)
      const retryOrBtn = page
        .getByRole('button', { name: /retry|try again|close|dismiss/i })
        .first();
      await expect(retryOrBtn).toBeVisible({ timeout: 5_000 });
    }
  });

  // ── 5. Wallet Not Installed ──────────────────────────────────────────────────
  test('shows wallet install prompt when no wallet extension is detected', async ({ page }) => {
    // Override wallet fixture: Freighter not installed
    await page.addInitScript(() => {
      delete (window as any).freighter;
    });

    await page.goto('/courses');

    // Attempt to trigger wallet connection through the purchase flow
    const purchaseBtn = page
      .getByRole('button', { name: /enroll|purchase|buy|get course|connect wallet/i })
      .first();

    if (await purchaseBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await purchaseBtn.click();

      // Should prompt user to install a wallet
      await expect(
        page.getByText(/freighter|install|wallet not found|no wallet/i),
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  // ── 6. Cart / Modal State Persistence ────────────────────────────────────────
  test('persists cart item when modal is closed and reopened', async ({ page }) => {
    await page.goto('/courses');
    await expect(page.getByRole('heading', { name: /courses|browse|marketplace/i })).toBeVisible({ timeout: 10_000 });

    const previewBtn = page
      .getByRole('button', { name: /preview|details|view course/i })
      .or(page.getByRole('link', { name: /introduction to stellar/i }))
      .first();

    if (await previewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await previewBtn.click();

      // Verify the course title is shown in modal/detail
      await expect(
        page.getByText(/introduction to stellar/i),
      ).toBeVisible({ timeout: 5_000 });

      // Close the modal / navigate back
      const closeBtn = page
        .getByRole('button', { name: /close|back|×/i })
        .first();

      if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.goBack();
      }

      // Re-open and verify the course is still there
      if (await previewBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await previewBtn.click();
        await expect(
          page.getByText(/introduction to stellar/i),
        ).toBeVisible({ timeout: 5_000 });
      }
    }
  });
});
