import { test, expect } from '@playwright/test';
import { EnrollmentPage, LoginPage, RegisterPage, uniqueUser } from './page-objects';

/**
 * Verifies that a credential appears on the credentials page after a user
 * completes all lessons in a course.
 *
 * This test assumes:
 *  - A seeded course exists with id=1 and a single lesson.
 *  - The staging environment is pre-seeded (or the test registers a fresh user).
 */

test.describe('Credential issuance journey', () => {
  test('credential appears in credentials page after course completion', async ({ page }) => {
    const user = uniqueUser('creduser');

    // ── Register & login ─────────────────────────────────────────────────────
    await new RegisterPage(page).register(user);
    await new LoginPage(page).loginIfRedirected(user);

    await expect(page).not.toHaveURL(/login|register/);

    // ── Enroll in course 1 ───────────────────────────────────────────────────
    const enrollment = new EnrollmentPage(page);
    await enrollment.goto(1);
    await expect(enrollment.enrollButton).toBeVisible();
    await enrollment.enroll();
    await expect(enrollment.enrolledConfirmation).toBeVisible({ timeout: 8_000 });

    // ── Complete every lesson ────────────────────────────────────────────────
    // Navigate through all lessons and mark each complete
    const lessonLinks = page.getByRole('link', { name: /lesson/i });
    const count = await lessonLinks.count();

    for (let i = 0; i < count; i++) {
      // Re-query after each navigation to avoid stale handles
      await page
        .getByRole('link', { name: /lesson/i })
        .nth(i)
        .click();
      await expect(page).toHaveURL(/lesson/);

      const completeBtn = page.getByRole('button', {
        name: /mark (as )?complete|complete lesson/i,
      });
      await expect(completeBtn).toBeVisible();
      await completeBtn.click();
      await expect(page.getByText(/completed|progress saved/i)).toBeVisible({ timeout: 8_000 });

      // Go back to course page for next lesson
      await enrollment.goto(1);
    }

    // ── Verify credential issued ─────────────────────────────────────────────
    await page.goto('/credentials');

    // The credential card should reference the completed course
    await expect(page.getByText(/intro to stellar|credential|certificate/i)).toBeVisible({
      timeout: 15_000,
    });

    // Confirm it has a Stellar transaction ID or on-chain indicator
    await expect(page.getByText(/stellar|blockchain|on-chain|transaction/i)).toBeVisible();
  });
});
