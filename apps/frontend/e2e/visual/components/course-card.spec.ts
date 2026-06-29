import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Course Card component
 * Tests different states, themes, and variants
 */

test.describe('Course Card - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
  });

  test('course card light mode', async ({ page }) => {
    const courseCard = page.locator('[data-testid="course-card"]').first();
    if (await courseCard.isVisible()) {
      await expect(courseCard).toHaveScreenshot('course-card-light.png');
    }
  });

  test('course card dark mode', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
    
    const courseCard = page.locator('[data-testid="course-card"]').first();
    if (await courseCard.isVisible()) {
      await expect(courseCard).toHaveScreenshot('course-card-dark.png');
    }
  });

  test('course card hover state', async ({ page }) => {
    const courseCard = page.locator('[data-testid="course-card"]').first();
    if (await courseCard.isVisible()) {
      await courseCard.hover();
      await page.waitForTimeout(300); // Wait for hover transition
      await expect(courseCard).toHaveScreenshot('course-card-hover.png');
    }
  });

  test('course card enrolled state', async ({ page }) => {
    const enrolledCard = page.locator('[data-testid="course-card"][data-enrolled="true"]').first();
    if (await enrolledCard.isVisible()) {
      await expect(enrolledCard).toHaveScreenshot('course-card-enrolled.png');
    }
  });

  test('course card mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const courseCard = page.locator('[data-testid="course-card"]').first();
    if (await courseCard.isVisible()) {
      await expect(courseCard).toHaveScreenshot('course-card-mobile.png');
    }
  });

  test('course card grid layout', async ({ page }) => {
    const courseGrid = page.locator('[data-testid="course-grid"], .grid').first();
    if (await courseGrid.isVisible()) {
      await expect(courseGrid).toHaveScreenshot('course-grid.png', {
        maxDiffPixels: 100 // Allow minor differences for dynamic content
      });
    }
  });
});
