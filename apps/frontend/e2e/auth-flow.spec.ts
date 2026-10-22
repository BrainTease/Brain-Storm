import { test, expect } from '@playwright/test';
import { LoginPage, RegisterPage, registerAndLogin, uniqueUser } from './page-objects';

test.describe('Authentication Flow E2E', () => {
  test('register with valid credentials', async ({ page }) => {
    await new RegisterPage(page).register(uniqueUser('authtest'));

    await expect(page).toHaveURL(/login|dashboard|courses/, { timeout: 10_000 });
  });

  test('login with valid credentials', async ({ page }) => {
    await registerAndLogin(page, uniqueUser('authtest'));

    await expect(page).not.toHaveURL(/login/, { timeout: 10_000 });
  });

  test('logout clears session', async ({ page }) => {
    await registerAndLogin(page, uniqueUser('authtest'));

    await new LoginPage(page).logout();

    await expect(page).toHaveURL(/login|auth/, { timeout: 10_000 });
  });

  test('invalid credentials show error', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.login({ email: 'invalid@example.com', password: 'wrongpassword' });

    await expect(loginPage.errorMessage).toBeVisible({ timeout: 5_000 });
  });
});
