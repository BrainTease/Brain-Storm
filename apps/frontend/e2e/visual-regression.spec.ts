import { test, expect } from '@playwright/test';
import { CoursesPage, EnrollmentPage } from './page-objects';

test.describe('Visual Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
  });

  test('homepage should match baseline', async ({ page }) => {
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      mask: [page.locator('[data-testid="dynamic-content"]')],
    });
  });

  test('course card should match baseline', async ({ page }) => {
    const courses = new CoursesPage(page);
    await courses.goto();
    const courseCard = courses.courseCard.first();
    await courseCard.waitFor();
    await expect(courseCard).toHaveScreenshot('course-card.png');
  });

  test('user profile page should match baseline', async ({ page }) => {
    await page.goto('http://localhost:3001/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('profile-page.png', { fullPage: true });
  });

  test('enrollment modal should match baseline', async ({ page }) => {
    const enrollment = new EnrollmentPage(page);
    await enrollment.goto(1);
    await enrollment.enrollButtonByTestId.click();
    await enrollment.enrollmentModal.waitFor();
    await expect(enrollment.enrollmentModal).toHaveScreenshot('enrollment-modal.png');
  });

  test('dashboard should match baseline', async ({ page }) => {
    await page.goto('http://localhost:3001/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
  });
});
