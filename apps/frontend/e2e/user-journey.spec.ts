import { test, expect } from '@playwright/test';
import { CoursesPage, EnrollmentPage, LoginPage, RegisterPage, uniqueUser } from './page-objects';

test.describe('Critical user journey: register → enroll → complete lesson', () => {
  test('register → login → browse courses → enroll → view lesson → mark complete', async ({
    page,
  }) => {
    const user = uniqueUser('testuser');

    // ── 1. Register ──────────────────────────────────────────────────────────
    await new RegisterPage(page).register(user);

    // After registration the app should redirect to login or dashboard
    await expect(page).toHaveURL(/login|dashboard|courses/);

    // ── 2. Login ─────────────────────────────────────────────────────────────
    // If redirected to login, fill credentials; otherwise already authenticated
    if (await new LoginPage(page).loginIfRedirected(user)) {
      await expect(page).not.toHaveURL(/login/);
    }

    // ── 3. Browse courses ────────────────────────────────────────────────────
    const courses = new CoursesPage(page);
    await courses.goto();
    await expect(courses.heading).toBeVisible();

    // Pick the first course
    await expect(courses.viewCourseLink).toBeVisible();
    await courses.viewCourseLink.click();

    // ── 4. Enroll ────────────────────────────────────────────────────────────
    await expect(page).toHaveURL(/courses\/\d+|courses\/.+/);
    const enrollment = new EnrollmentPage(page);
    await expect(enrollment.enrollButton).toBeVisible();
    await enrollment.enroll();

    // Confirm enrollment feedback
    await expect(enrollment.enrolledConfirmation).toBeVisible({ timeout: 8_000 });

    // ── 5. View first lesson ─────────────────────────────────────────────────
    const lessonLink = page.getByRole('link', { name: /lesson|start|begin/i }).first();
    await expect(lessonLink).toBeVisible();
    await lessonLink.click();
    await expect(page).toHaveURL(/lesson/);

    // ── 6. Mark lesson complete ───────────────────────────────────────────────
    const completeBtn = page.getByRole('button', { name: /mark (as )?complete|complete lesson/i });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();

    await expect(page.getByText(/completed|lesson complete|well done|progress saved/i)).toBeVisible(
      { timeout: 8_000 }
    );
  });
});
