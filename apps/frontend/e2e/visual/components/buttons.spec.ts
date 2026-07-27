import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Button components
 * Tests different variants, sizes, and states
 */

test.describe('Buttons - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('primary button light mode', async ({ page }) => {
    const primaryButton = page.locator('button.btn-primary, button[variant="primary"]').first();
    if (await primaryButton.isVisible()) {
      await expect(primaryButton).toHaveScreenshot('button-primary-light.png');
    }
  });

  test('primary button dark mode', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
    
    const primaryButton = page.locator('button.btn-primary, button[variant="primary"]').first();
    if (await primaryButton.isVisible()) {
      await expect(primaryButton).toHaveScreenshot('button-primary-dark.png');
    }
  });

  test('primary button hover state', async ({ page }) => {
    const primaryButton = page.locator('button.btn-primary, button[variant="primary"]').first();
    if (await primaryButton.isVisible()) {
      await primaryButton.hover();
      await page.waitForTimeout(200);
      await expect(primaryButton).toHaveScreenshot('button-primary-hover.png');
    }
  });

  test('primary button focus state', async ({ page }) => {
    const primaryButton = page.locator('button.btn-primary, button[variant="primary"]').first();
    if (await primaryButton.isVisible()) {
      await primaryButton.focus();
      await page.waitForTimeout(100);
      await expect(primaryButton).toHaveScreenshot('button-primary-focus.png');
    }
  });

  test('secondary button variants', async ({ page }) => {
    const secondaryButton = page.locator('button.btn-secondary, button[variant="secondary"]').first();
    if (await secondaryButton.isVisible()) {
      await expect(secondaryButton).toHaveScreenshot('button-secondary.png');
    }
  });

  test('disabled button state', async ({ page }) => {
    const disabledButton = page.locator('button:disabled, button[disabled]').first();
    if (await disabledButton.isVisible()) {
      await expect(disabledButton).toHaveScreenshot('button-disabled.png');
    }
  });

  test('button loading state', async ({ page }) => {
    const loadingButton = page.locator('button[data-loading="true"], button .spinner').first();
    if (await loadingButton.isVisible()) {
      await expect(loadingButton).toHaveScreenshot('button-loading.png', {
        animations: 'disabled' // Disable spinner animation for consistent snapshots
      });
    }
  });
});
