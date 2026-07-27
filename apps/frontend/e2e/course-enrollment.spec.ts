import { test, expect } from '@playwright/test';

function uniqueUser() {
  const ts = Date.now();
  return {
    username: `enrolltest_${ts}`,
    email: `enrolltest_${ts}@example.com`,
    password: 'SecurePass@123',
  };
}

test.describe('Course Enrollment E2E', () => {
  test('enroll in available course', async ({ page }) => {
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
    
    // Browse courses
    await page.goto('/courses');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Enroll in first course
    const enrollBtn = page.getByRole('button', { name: /enroll/i }).first();
    await expect(enrollBtn).toBeVisible();
    await enrollBtn.click();
    
    await expect(page.getByText(/enrolled|enrollment confirmed|you are enrolled/i)).toBeVisible({ timeout: 8_000 });
  });

  test('view enrolled courses', async ({ page }) => {
    const user = uniqueUser();
    
    // Register, login, and enroll
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
    
    await page.goto('/courses');
    const enrollBtn = page.getByRole('button', { name: /enroll/i }).first();
    await enrollBtn.click();
    
    // Navigate to my courses
    await page.goto('/dashboard');
    await expect(page.getByText(/my courses|enrolled courses|in progress/i)).toBeVisible({ timeout: 8_000 });
  });

  test('cannot enroll twice in same course', async ({ page }) => {
    const user = uniqueUser();
    
    // Register, login, and enroll
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
    
    await page.goto('/courses');
    const enrollBtn = page.getByRole('button', { name: /enroll/i }).first();
    await enrollBtn.click();
    
    await expect(page.getByText(/enrolled|enrollment confirmed/i)).toBeVisible({ timeout: 8_000 });
    
    // Try to enroll again
    const enrollBtnAgain = page.getByRole('button', { name: /enroll/i }).first();
    if (await enrollBtnAgain.isVisible()) {
      await enrollBtnAgain.click();
      await expect(page.getByText(/already enrolled|already enrolled|cannot enroll/i)).toBeVisible({ timeout: 5_000 });
    }
  });
});
