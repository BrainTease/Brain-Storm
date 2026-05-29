import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
  });

  test('homepage should match baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="dynamic-content"]')],
    });
  });

  test('course card should match baseline', async ({ page }) => {
    await page.goto('http://localhost:3001/courses');
    await page.waitForSelector('[data-testid="course-card"]');
    const courseCard = page.locator('[data-testid="course-card"]').first();
    await expect(courseCard).toHaveScreenshot('course-card.png');
  });

  test('user profile page should match baseline', async ({ page }) => {
    await page.goto('http://localhost:3001/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('profile-page.png', { fullPage: true });
  });

  test('enrollment modal should match baseline', async ({ page }) => {
    await page.goto('http://localhost:3001/courses/1');
    await page.click('[data-testid="enroll-button"]');
    await page.waitForSelector('[data-testid="enrollment-modal"]');
    const modal = page.locator('[data-testid="enrollment-modal"]');
    await expect(modal).toHaveScreenshot('enrollment-modal.png');
  });

  test('dashboard should match baseline', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });
});
