import { test as base, Page } from '@playwright/test';
import { LoginPage, RegisterPage, TestUser, uniqueUser } from '../page-objects';

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
    await new RegisterPage(page).register(testUser);

    // Login if redirected
    if (await new LoginPage(page).loginIfRedirected(testUser)) {
      await page.waitForURL(/dashboard|courses/);
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
