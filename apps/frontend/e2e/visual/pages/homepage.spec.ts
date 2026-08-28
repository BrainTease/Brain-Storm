import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Homepage
 * Tests different themes and viewport sizes
 */

test.describe('Homepage - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Allow for any animations to complete
  });

  test('homepage light mode - desktop', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage-light-desktop.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="dynamic-content"]'),
      ],
    });
  });

  test('homepage dark mode - desktop', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('homepage-dark-desktop.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="dynamic-content"]'),
      ],
    });
  });

  test('homepage light mode - tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-light-tablet.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="timestamp"]')],
    });
  });

  test('homepage light mode - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-light-mobile.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="timestamp"]')],
    });
  });

  test('homepage dark mode - mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('homepage-dark-mobile.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="timestamp"]')],
    });
  });

  test('homepage hero section', async ({ page }) => {
    const heroSection = page.locator('[data-testid="hero-section"], section').first();
    if (await heroSection.isVisible()) {
      await expect(heroSection).toHaveScreenshot('homepage-hero.png');
    }
  });

  test('homepage features section', async ({ page }) => {
    const featuresSection = page.locator('[data-testid="features-section"]').first();
    if (await featuresSection.isVisible()) {
      await featuresSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await expect(featuresSection).toHaveScreenshot('homepage-features.png');
    }
  });
});
