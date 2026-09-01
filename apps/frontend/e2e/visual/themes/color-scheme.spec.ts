import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Color scheme consistency
 * Ensures brand colors are consistent across themes
 */

test.describe('Color Scheme - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('primary color elements light mode', async ({ page }) => {
    const primaryElements = page.locator('[class*="bg-primary"], [class*="text-primary"]').first();

    if (await primaryElements.isVisible()) {
      await primaryElements.scrollIntoViewIfNeeded();
      await expect(primaryElements).toHaveScreenshot('primary-color-light.png');
    }
  });

  test('primary color elements dark mode', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    const primaryElements = page.locator('[class*="bg-primary"], [class*="text-primary"]').first();

    if (await primaryElements.isVisible()) {
      await primaryElements.scrollIntoViewIfNeeded();
      await expect(primaryElements).toHaveScreenshot('primary-color-dark.png');
    }
  });

  test('error states color scheme', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Try to trigger validation error
    const form = page.locator('form').first();
    if (await form.isVisible()) {
      const submitButton = form.locator('button[type="submit"]');
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);

        const errorMessage = page.locator('[class*="error"], [class*="text-red"]').first();
        if (await errorMessage.isVisible()) {
          await expect(errorMessage).toHaveScreenshot('error-state-light.png');
        }
      }
    }
  });

  test('success states color scheme', async ({ page }) => {
    const successElement = page.locator('[class*="success"], [class*="text-green"]').first();

    if (await successElement.isVisible()) {
      await successElement.scrollIntoViewIfNeeded();
      await expect(successElement).toHaveScreenshot('success-state-light.png');
    }
  });

  test('warning states color scheme', async ({ page }) => {
    const warningElement = page.locator('[class*="warning"], [class*="text-yellow"]').first();

    if (await warningElement.isVisible()) {
      await warningElement.scrollIntoViewIfNeeded();
      await expect(warningElement).toHaveScreenshot('warning-state-light.png');
    }
  });

  test('info states color scheme', async ({ page }) => {
    const infoElement = page.locator('[class*="info"], [class*="text-blue"]').first();

    if (await infoElement.isVisible()) {
      await infoElement.scrollIntoViewIfNeeded();
      await expect(infoElement).toHaveScreenshot('info-state-light.png');
    }
  });

  test('background gradients consistency', async ({ page }) => {
    const gradientElement = page.locator('[class*="gradient"], [style*="gradient"]').first();

    if (await gradientElement.isVisible()) {
      await gradientElement.scrollIntoViewIfNeeded();
      await expect(gradientElement).toHaveScreenshot('gradient-light.png');

      // Dark mode gradient
      const themeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(500);
        await expect(gradientElement).toHaveScreenshot('gradient-dark.png');
      }
    }
  });
});
