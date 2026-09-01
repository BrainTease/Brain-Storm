import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Dashboard page
 * Tests user dashboard with different states
 */

test.describe('Dashboard - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('dashboard light mode - desktop', async ({ page }) => {
    await expect(page).toHaveScreenshot('dashboard-light-desktop.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="user-avatar"]'),
      ],
      maxDiffPixels: 150,
    });
  });

  test('dashboard dark mode - desktop', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }

    await expect(page).toHaveScreenshot('dashboard-dark-desktop.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="timestamp"]'),
        page.locator('[data-testid="user-avatar"]'),
      ],
      maxDiffPixels: 150,
    });
  });

  test('dashboard mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="timestamp"]')],
      maxDiffPixels: 150,
    });
  });

  test('dashboard stats cards', async ({ page }) => {
    const statsSection = page.locator('[data-testid="dashboard-stats"], .stats-grid').first();
    if (await statsSection.isVisible()) {
      await expect(statsSection).toHaveScreenshot('dashboard-stats.png', {
        maxDiffPixels: 100,
      });
    }
  });

  test('dashboard progress section', async ({ page }) => {
    const progressSection = page.locator('[data-testid="progress-section"]').first();
    if (await progressSection.isVisible()) {
      await progressSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await expect(progressSection).toHaveScreenshot('dashboard-progress.png', {
        animations: 'disabled', // Disable progress bar animations
        maxDiffPixels: 100,
      });
    }
  });

  test('dashboard enrolled courses', async ({ page }) => {
    const coursesSection = page.locator('[data-testid="enrolled-courses"]').first();
    if (await coursesSection.isVisible()) {
      await coursesSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await expect(coursesSection).toHaveScreenshot('dashboard-enrolled-courses.png', {
        maxDiffPixels: 100,
      });
    }
  });
});
