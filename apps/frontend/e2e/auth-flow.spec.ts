import { test, expect } from '@playwright/test';

function uniqueUser() {
  const ts = Date.now();
  return {
    username: `authtest_${ts}`,
    email: `authtest_${ts}@example.com`,
    password: 'SecurePass@123',
  };
}

test.describe('Authentication Flow E2E', () => {
  test('register with valid credentials', async ({ page }) => {
    const user = uniqueUser();
    
    await page.goto('/auth/register');
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill(user.password);
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    await expect(page).toHaveURL(/login|dashboard|courses/, { timeout: 10_000 });
  });

  test('login with valid credentials', async ({ page }) => {
    const user = uniqueUser();
    
    // First register
    await page.goto('/auth/register');
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill(user.password);
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    // Then login
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await expect(page).not.toHaveURL(/login/, { timeout: 10_000 });
  });

  test('logout clears session', async ({ page }) => {
    const user = uniqueUser();
    
    // Register and login
    await page.goto('/auth/register');
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill(user.password);
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    // Logout
    await page.getByRole('button', { name: /logout|sign out|log out/i }).click();
    
    await expect(page).toHaveURL(/login|auth/, { timeout: 10_000 });
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/^password$/i).fill('wrongpassword');
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await expect(page.getByText(/invalid|incorrect|error|failed/i)).toBeVisible({ timeout: 5_000 });
  });
});
