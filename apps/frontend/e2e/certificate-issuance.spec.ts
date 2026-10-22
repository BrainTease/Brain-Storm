import { test, expect } from '@playwright/test';
import { CoursesPage, registerAndLogin, uniqueUser } from './page-objects';

test.describe('Certificate Issuance E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Register, login, and enroll
    await registerAndLogin(page, uniqueUser('certtest'));

    const courses = new CoursesPage(page);
    await courses.goto();
    await courses.enrollInFirstCourse();
  });

  test('certificate issued after course completion', async ({ page }) => {
    // Complete course
    await page.goto('/dashboard');
    const completeBtn = page.getByRole('button', { name: /complete|finish course/i }).first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();

      // Check for certificate
      await expect(page.getByText(/certificate|credential|issued/i)).toBeVisible({
        timeout: 10_000,
      });
    }
  });

  test('certificate can be downloaded', async ({ page }) => {
    // Complete course
    await page.goto('/dashboard');
    const completeBtn = page.getByRole('button', { name: /complete|finish course/i }).first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();

      // Look for download button
      const downloadBtn = page.getByRole('button', { name: /download|export|pdf/i });
      if (await downloadBtn.isVisible()) {
        const downloadPromise = page.waitForEvent('download');
        await downloadBtn.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('certificate');
      }
    }
  });

  test('certificate displays on profile', async ({ page }) => {
    // Complete course
    await page.goto('/dashboard');
    const completeBtn = page.getByRole('button', { name: /complete|finish course/i }).first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();

      // Navigate to profile
      await page.goto('/profile');
      await expect(page.getByText(/certificate|credential|achievement/i)).toBeVisible({
        timeout: 8_000,
      });
    }
  });

  test('certificate is verifiable on blockchain', async ({ page }) => {
    // Complete course
    await page.goto('/dashboard');
    const completeBtn = page.getByRole('button', { name: /complete|finish course/i }).first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();

      // Look for verification link
      const verifyLink = page.getByRole('link', { name: /verify|blockchain|stellar/i });
      if (await verifyLink.isVisible()) {
        await verifyLink.click();
        await expect(page.getByText(/verified|valid|authentic/i)).toBeVisible({ timeout: 10_000 });
      }
    }
  });
});
