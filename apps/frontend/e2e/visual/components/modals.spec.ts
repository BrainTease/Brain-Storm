import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Modal components
 * Tests different modal types and states
 */

test.describe('Modals - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('enrollment modal light mode', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const enrollButton = page.locator('[data-testid="enroll-button"]').first();
    if (await enrollButton.isVisible()) {
      await enrollButton.click();
      await page.waitForSelector('[data-testid="enrollment-modal"], [role="dialog"]');
      await page.waitForTimeout(300); // Wait for animation

      const modal = page.locator('[data-testid="enrollment-modal"], [role="dialog"]').first();
      await expect(modal).toHaveScreenshot('modal-enrollment-light.png');
    }
  });

  test('enrollment modal dark mode', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const enrollButton = page.locator('[data-testid="enroll-button"]').first();
    if (await enrollButton.isVisible()) {
      await enrollButton.click();
      await page.waitForSelector('[data-testid="enrollment-modal"], [role="dialog"]');
      await page.waitForTimeout(300);

      const modal = page.locator('[data-testid="enrollment-modal"], [role="dialog"]').first();
      await expect(modal).toHaveScreenshot('modal-enrollment-dark.png');
    }
  });

  test('confirmation modal', async ({ page }) => {
    const deleteButton = page
      .locator('[data-testid="delete-button"], button:has-text("Delete")')
      .first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
      await page.waitForSelector('[role="dialog"]');
      await page.waitForTimeout(300);

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toHaveScreenshot('modal-confirmation.png');
    }
  });

  test('modal backdrop blur', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const enrollButton = page.locator('[data-testid="enroll-button"]').first();
    if (await enrollButton.isVisible()) {
      await enrollButton.click();
      await page.waitForSelector('[role="dialog"]');
      await page.waitForTimeout(300);

      // Screenshot entire page to capture backdrop effect
      await expect(page).toHaveScreenshot('modal-with-backdrop.png', {
        fullPage: false,
      });
    }
  });

  test('modal mobile responsive', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const enrollButton = page.locator('[data-testid="enroll-button"]').first();
    if (await enrollButton.isVisible()) {
      await enrollButton.click();
      await page.waitForSelector('[role="dialog"]');
      await page.waitForTimeout(300);

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toHaveScreenshot('modal-mobile.png');
    }
  });
});
