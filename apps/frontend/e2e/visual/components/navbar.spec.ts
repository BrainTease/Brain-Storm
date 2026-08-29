import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Navbar component
 * Tests different states and theme variations
 */

test.describe('Navbar - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('navbar light mode - desktop', async ({ page }) => {
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible();
    await expect(navbar).toHaveScreenshot('navbar-light-desktop.png');
  });

  test('navbar dark mode - desktop', async ({ page }) => {
    // Toggle to dark mode
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500); // Wait for theme transition
    }

    const navbar = page.locator('nav').first();
    await expect(navbar).toHaveScreenshot('navbar-dark-desktop.png');
  });

  test('navbar light mode - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const navbar = page.locator('nav').first();
    await expect(navbar).toHaveScreenshot('navbar-light-mobile.png');
  });

  test('navbar dark mode - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    const navbar = page.locator('nav').first();
    await expect(navbar).toHaveScreenshot('navbar-dark-mobile.png');
  });

  test('navbar with mobile menu open', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Open mobile menu
    const menuButton = page
      .locator('button[aria-label="Menu"], button[aria-label="Open menu"]')
      .first();
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300); // Wait for animation

      await expect(page).toHaveScreenshot('navbar-mobile-menu-open.png', {
        fullPage: true,
      });
    }
  });

  test('navbar user menu hover state', async ({ page }) => {
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label="User menu"]').first();
    if (await userMenu.isVisible()) {
      await userMenu.hover();
      await page.waitForTimeout(200);

      await expect(page.locator('nav').first()).toHaveScreenshot('navbar-user-menu-hover.png');
    }
  });
});
