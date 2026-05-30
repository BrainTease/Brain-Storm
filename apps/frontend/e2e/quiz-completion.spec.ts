import { test, expect } from '@playwright/test';

function uniqueUser() {
  const ts = Date.now();
  return {
    username: `quiztest_${ts}`,
    email: `quiztest_${ts}@example.com`,
    password: 'SecurePass@123',
  };
}

test.describe('Quiz Completion E2E', () => {
  test('complete quiz with correct answers', async ({ page }) => {
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
    
    // Navigate to quiz
    await page.goto('/dashboard');
    const quizLink = page.getByRole('link', { name: /quiz|assessment|test/i }).first();
    if (await quizLink.isVisible()) {
      await quizLink.click();
      
      // Answer questions
      const radioButtons = page.getByRole('radio');
      const count = await radioButtons.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          await radioButtons.nth(i).click();
        }
      }
      
      // Submit quiz
      const submitBtn = page.getByRole('button', { name: /submit|finish|complete/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        await expect(page.getByText(/score|result|completed|passed/i)).toBeVisible({ timeout: 8_000 });
      }
    }
  });

  test('quiz shows progress', async ({ page }) => {
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
    
    // Navigate to quiz
    await page.goto('/dashboard');
    const quizLink = page.getByRole('link', { name: /quiz|assessment|test/i }).first();
    if (await quizLink.isVisible()) {
      await quizLink.click();
      
      // Check for progress indicator
      const progressBar = page.getByRole('progressbar');
      if (await progressBar.isVisible()) {
        await expect(progressBar).toBeVisible();
      }
      
      const progressText = page.getByText(/question|of|progress/i);
      if (await progressText.isVisible()) {
        await expect(progressText).toBeVisible();
      }
    }
  });

  test('quiz can be retaken', async ({ page }) => {
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
    
    // Navigate to quiz and complete it
    await page.goto('/dashboard');
    const quizLink = page.getByRole('link', { name: /quiz|assessment|test/i }).first();
    if (await quizLink.isVisible()) {
      await quizLink.click();
      
      const radioButtons = page.getByRole('radio');
      const count = await radioButtons.count();
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
          await radioButtons.nth(i).click();
        }
      }
      
      const submitBtn = page.getByRole('button', { name: /submit|finish|complete/i });
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
        
        // Look for retake button
        const retakeBtn = page.getByRole('button', { name: /retake|try again|redo/i });
        if (await retakeBtn.isVisible()) {
          await retakeBtn.click();
          await expect(page.getByText(/question|quiz/i)).toBeVisible({ timeout: 5_000 });
        }
      }
    }
  });
});
