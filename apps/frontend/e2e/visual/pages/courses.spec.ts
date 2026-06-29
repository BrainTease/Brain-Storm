import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Courses page
 * Tests different layouts and filtering states
 */

test.describe('Courses Page - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('courses page light mode - desktop', async ({ page }) => {
    await expect(page).toHaveScreenshot('courses-page-light-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100 // Allow minor differences for dynamic content
    });
  });

  test('courses page dark mode - desktop', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page).toHaveScreenshot('courses-page-dark-desktop.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('courses page mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('courses-page-mobile.png', {
      fullPage: true,
      maxDiffPixels: 100
    });
  });

  test('courses page with filters applied', async ({ page }) => {
    // Apply a filter if available
    const filterButton = page.locator('[data-testid="filter-button"], button:has-text("Filter")').first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(300);
      
      const filterOption = page.locator('[data-testid="filter-option"]').first();
      if (await filterOption.isVisible()) {
        await filterOption.click();
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot('courses-page-filtered.png', {
          fullPage: true,
          maxDiffPixels: 100
        });
      }
    }
  });

  test('courses page search active', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('blockchain');
      await page.waitForTimeout(500); // Wait for search results
      
      await expect(page).toHaveScreenshot('courses-page-search.png', {
        fullPage: true,
        maxDiffPixels: 100
      });
    }
  });

  test('courses page empty state', async ({ page }) => {
    // Try to trigger empty state
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('xyznonexistentcourse123');
      await page.waitForTimeout(500);
      
      const emptyState = page.locator('[data-testid="empty-state"], .empty-state').first();
      if (await emptyState.isVisible()) {
        await expect(emptyState).toHaveScreenshot('courses-empty-state.png');
      }
    }
  });
});
