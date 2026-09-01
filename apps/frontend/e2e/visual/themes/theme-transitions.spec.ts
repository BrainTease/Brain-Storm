import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Theme transitions
 * Tests smooth transitions between light and dark modes
 */

test.describe('Theme Transitions - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('homepage theme toggle transition', async ({ page }) => {
    // Capture light mode
    await expect(page).toHaveScreenshot('theme-light-before.png', {
      fullPage: false,
      mask: [page.locator('[data-testid="timestamp"]')],
    });

    // Toggle to dark mode
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500); // Wait for transition to complete

      // Capture dark mode
      await expect(page).toHaveScreenshot('theme-dark-after.png', {
        fullPage: false,
        mask: [page.locator('[data-testid="timestamp"]')],
      });
    }
  });

  test('theme toggle button appearance', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      // Light mode button
      await expect(themeToggle).toHaveScreenshot('theme-toggle-light.png');

      // Dark mode button
      await themeToggle.click();
      await page.waitForTimeout(500);
      await expect(themeToggle).toHaveScreenshot('theme-toggle-dark.png');
    }
  });

  test('theme persistence across pages', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      // Set dark mode
      await themeToggle.click();
      await page.waitForTimeout(500);

      // Navigate to courses page
      await page.goto('/courses');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);

      // Verify dark mode persists
      await expect(page).toHaveScreenshot('theme-dark-courses.png', {
        fullPage: false,
        maxDiffPixels: 100,
      });
    }
  });

  test('form elements in both themes', async ({ page }) => {
    const formInput = page.locator('input[type="text"], input[type="email"]').first();

    if (await formInput.isVisible()) {
      // Light mode form
      await formInput.scrollIntoViewIfNeeded();
      await expect(formInput).toHaveScreenshot('form-input-light.png');

      // Dark mode form
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(500);
        await expect(formInput).toHaveScreenshot('form-input-dark.png');
      }
    }
  });

  test('card components theme contrast', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const card = page.locator('[data-testid="course-card"]').first();

    if (await card.isVisible()) {
      // Light mode card
      await expect(card).toHaveScreenshot('card-light-theme.png');

      // Dark mode card
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(500);
        await expect(card).toHaveScreenshot('card-dark-theme.png');
      }
    }
  });

  test('shadows and borders in different themes', async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');

    const container = page.locator('.shadow, [class*="shadow"]').first();

    if (await container.isVisible()) {
      // Light mode shadows
      await container.scrollIntoViewIfNeeded();
      await expect(container).toHaveScreenshot('shadows-light.png');

      // Dark mode shadows
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(500);
        await expect(container).toHaveScreenshot('shadows-dark.png');
      }
    }
  });
});
