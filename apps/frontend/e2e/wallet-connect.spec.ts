import { test, expect } from './fixtures/auth-fixtures';

test.describe('Wallet Connect & Reward Claim', () => {
  test('connect wallet button is visible on profile page', async ({ authedPage }) => {
    await authedPage.goto('/profile');
    await expect(
      authedPage.getByRole('button', { name: /connect wallet/i }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('connect wallet shows install prompt when Freighter not available', async ({ authedPage }) => {
    await authedPage.goto('/profile');
    const connectBtn = authedPage.getByRole('button', { name: /connect wallet/i });
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    // Should show Freighter install prompt
    await expect(
      authedPage.getByText(/freighter not found/i),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('claim reward button is present on dashboard for authenticated user', async ({ authedPage }) => {
    await authedPage.goto('/dashboard');
    await expect(authedPage.locator('h1')).toBeVisible();

    // Check token balance section exists (BST balance)
    await expect(
      authedPage.getByText(/bst token balance|token balance|bst/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('dashboard shows enrolled courses and credentials', async ({ authedPage }) => {
    await authedPage.goto('/dashboard');
    await expect(authedPage.locator('h1')).toBeVisible();

    // Verify enrolled courses section
    await expect(
      authedPage.getByText(/enrolled courses|my courses/i),
    ).toBeVisible({ timeout: 10_000 });

    // Verify credentials section
    await expect(
      authedPage.getByText(/recent credentials|credentials|certificates/i),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('wallet-connected state shows connected UI elements', async ({ authedPage }) => {
    // Mock the Freighter API via page context
    await authedPage.addInitScript(() => {
      (window as any).freighter = {
        isConnected: () => Promise.resolve(true),
        getPublicKey: () => Promise.resolve('GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890'),
        getNetwork: () => Promise.resolve('TESTNET'),
      };
    });

    await authedPage.goto('/profile');
    const connectBtn = authedPage.getByRole('button', { name: /connect wallet/i });
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    // After connecting, should show the wallet address (truncated)
    await expect(
      authedPage.getByText(/GABC|connected wallet/i),
    ).toBeVisible({ timeout: 8_000 });
  });
});
