import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for Profile page
 * Tests user profile views and edit states
 */

test.describe('Profile Page - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('profile page light mode', async ({ page }) => {
    await expect(page).toHaveScreenshot('profile-light.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="user-avatar"]'),
        page.locator('[data-testid="email"]'),
        page.locator('[data-testid="username"]')
      ]
    });
  });

  test('profile page dark mode', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
    
    await expect(page).toHaveScreenshot('profile-dark.png', {
      fullPage: true,
      mask: [
        page.locator('[data-testid="user-avatar"]'),
        page.locator('[data-testid="email"]'),
        page.locator('[data-testid="username"]')
      ]
    });
  });

  test('profile page mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('profile-mobile.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="user-avatar"]')]
    });
  });

  test('profile edit mode', async ({ page }) => {
    const editButton = page.locator('[data-testid="edit-profile"], button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(300);
      
      await expect(page).toHaveScreenshot('profile-edit-mode.png', {
        fullPage: true,
        mask: [page.locator('[data-testid="user-avatar"]')]
      });
    }
  });

  test('profile achievements section', async ({ page }) => {
    const achievementsSection = page.locator('[data-testid="achievements-section"]').first();
    if (await achievementsSection.isVisible()) {
      await achievementsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await expect(achievementsSection).toHaveScreenshot('profile-achievements.png');
    }
  });

  test('profile certificates section', async ({ page }) => {
    const certificatesSection = page.locator('[data-testid="certificates-section"]').first();
    if (await certificatesSection.isVisible()) {
      await certificatesSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await expect(certificatesSection).toHaveScreenshot('profile-certificates.png');
    }
  });
});
