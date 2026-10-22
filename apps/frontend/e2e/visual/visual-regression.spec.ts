import { test, expect } from '@playwright/test';
import { CoursesPage } from '../page-objects';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for fonts and assets to load
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('homepage visual regression', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('courses page visual regression', async ({ page }) => {
    await new CoursesPage(page).goto();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('courses-page.png');
  });

  test('course card component visual regression', async ({ page }) => {
    const courses = new CoursesPage(page);
    await courses.goto();
    await page.waitForLoadState('networkidle');

    const courseCard = courses.courseCard.first();
    await expect(courseCard).toHaveScreenshot('course-card.png');
  });

  test('navigation bar visual regression', async ({ page }) => {
    const navbar = page.locator('nav');
    await expect(navbar).toHaveScreenshot('navbar.png');
  });

  test('dashboard visual regression', async ({ page }) => {
    // Mock authentication
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png');
  });

  test('profile page visual regression', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('profile-page.png');
  });

  test('mobile responsive visual regression', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('mobile-homepage.png');
  });

  test('dark mode visual regression', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Toggle dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500); // Wait for theme transition

    await expect(page).toHaveScreenshot('homepage-dark.png');
  });
});
