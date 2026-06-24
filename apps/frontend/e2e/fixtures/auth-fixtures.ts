import { test as base, Page } from '@playwright/test';

export interface TestUser {
  username: string;
  email: string;
  password: string;
}

/**
 * Creates a unique test user per invocation.
 */
export function uniqueUser(): TestUser {
  const ts = Date.now();
  return {
    username: `e2e_${ts}`,
    email: `e2e_${ts}@example.com`,
    password: 'Test@1234!',
  };
}

/**
 * Extended test fixture that pre-registers and logs in a user.
 */
export const test = base.extend<{
  authedPage: Page;
  testUser: TestUser;
}>({
  testUser: async ({}, use) => {
    await use(uniqueUser());
  },

  authedPage: async ({ page, testUser }, use) => {
    // Register
    await page.goto('/auth/register');
    await page.getByLabel(/username/i).fill(testUser.username);
    await page.getByLabel(/email/i).fill(testUser.email);
    await page.getByLabel(/^password$/i).fill(testUser.password);
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();

    // Login if redirected
    if (page.url().includes('login')) {
      await page.getByLabel(/email/i).fill(testUser.email);
      await page.getByLabel(/^password$/i).fill(testUser.password);
      await page.getByRole('button', { name: /log in|sign in/i }).click();
      await page.waitForURL(/dashboard|courses/);
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
