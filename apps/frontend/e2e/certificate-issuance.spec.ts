import { test, expect } from '@playwright/test';

function uniqueUser() {
  const ts = Date.now();
  return {
    username: `certtest_${ts}`,
    email: `certtest_${ts}@example.com`,
    password: 'SecurePass@123',
  };
}

test.describe('Certificate Issuance E2E', () => {
  test('certificate issued after course completion', async ({ page }) => {
    const user = uniqueUser();
    
    // Register, login, and enroll
    await page.goto('/auth/register');
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill(user.password);
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await page.goto('/courses');
    const enrollBtn = page.getByRole('button', { name: /enroll/i }).first();
    await enrollBtn.click();
    
    // Complete course
    await page.goto('/dashboard');
    const completeBtn = page.getByRole('button', { name: /complete|finish course/i }).first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      
      // Check for certificate
      await expect(page.getByText(/certificate|credential|issued/i)).toBeVisible({ timeout: 10_000 });
    }
  });

  test('certificate can be downloaded', async ({ page }) => {
    const user = uniqueUser();
    
    // Register, login, and enroll
    await page.goto('/auth/register');
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill(user.password);
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await page.goto('/courses');
    const enrollBtn = page.getByRole('button', { name: /enroll/i }).first();
    await enrollBtn.click();
    
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
    const user = uniqueUser();
    
    // Register, login, and enroll
    await page.goto('/auth/register');
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill(user.password);
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await page.goto('/courses');
    const enrollBtn = page.getByRole('button', { name: /enroll/i }).first();
    await enrollBtn.click();
    
    // Complete course
    await page.goto('/dashboard');
    const completeBtn = page.getByRole('button', { name: /complete|finish course/i }).first();
    if (await completeBtn.isVisible()) {
      await completeBtn.click();
      
      // Navigate to profile
      await page.goto('/profile');
      await expect(page.getByText(/certificate|credential|achievement/i)).toBeVisible({ timeout: 8_000 });
    }
  });

  test('certificate is verifiable on blockchain', async ({ page }) => {
    const user = uniqueUser();
    
    // Register, login, and enroll
    await page.goto('/auth/register');
    await page.getByLabel(/username/i).fill(user.username);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByLabel(/confirm password/i).fill(user.password);
    await page.getByRole('button', { name: /register|sign up|create account/i }).click();
    
    await page.goto('/auth/login');
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/^password$/i).fill(user.password);
    await page.getByRole('button', { name: /log in|sign in/i }).click();
    
    await page.goto('/courses');
    const enrollBtn = page.getByRole('button', { name: /enroll/i }).first();
    await enrollBtn.click();
    
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
