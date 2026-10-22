import { test, expect } from '@playwright/test';
import { CoursesPage, EnrollmentPage, registerAndLogin, uniqueUser } from './page-objects';

test.describe('Course Enrollment E2E', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page, uniqueUser('enrolltest'));
  });

  test('enroll in available course', async ({ page }) => {
    const courses = new CoursesPage(page);

    // Browse courses
    await courses.goto();
    await expect(courses.heading).toBeVisible();

    // Enroll in first course
    await expect(courses.enrollButtons.first()).toBeVisible();
    await courses.enrollInFirstCourse();

    await expect(new EnrollmentPage(page).enrolledConfirmation).toBeVisible({ timeout: 8_000 });
  });

  test('view enrolled courses', async ({ page }) => {
    const courses = new CoursesPage(page);
    await courses.goto();
    await courses.enrollInFirstCourse();

    // Navigate to my courses
    await page.goto('/dashboard');
    await expect(page.getByText(/my courses|enrolled courses|in progress/i)).toBeVisible({
      timeout: 8_000,
    });
  });

  test('cannot enroll twice in same course', async ({ page }) => {
    const courses = new CoursesPage(page);
    const enrollment = new EnrollmentPage(page);
    await courses.goto();
    await courses.enrollInFirstCourse();

    await expect(enrollment.enrolledConfirmation).toBeVisible({ timeout: 8_000 });

    // Try to enroll again
    if (await courses.enrollButtons.first().isVisible()) {
      await courses.enrollInFirstCourse();
      await expect(enrollment.alreadyEnrolledMessage).toBeVisible({ timeout: 5_000 });
    }
  });
});
