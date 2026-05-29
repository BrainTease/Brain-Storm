import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001');
    await injectAxe(page);
  });

  test('homepage should have no accessibility violations', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('login page should be keyboard navigable', async ({ page }) => {
    await page.goto('http://localhost:3001/login');

    // Tab through form elements
    await page.keyboard.press('Tab');
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();

    await page.keyboard.press('Tab');
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeFocused();

    await page.keyboard.press('Tab');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused();
  });

  test('course page should have proper heading hierarchy', async ({ page }) => {
    await page.goto('http://localhost:3001/courses');

    const h1 = page.locator('h1');
    const h2 = page.locator('h2');

    await expect(h1).toHaveCount(1);
    expect(await h2.count()).toBeGreaterThan(0);
  });

  test('buttons should have accessible labels', async ({ page }) => {
    await page.goto('http://localhost:3001/courses');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');

      expect(text || ariaLabel).toBeTruthy();
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('http://localhost:3001/courses');

    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');

      expect(alt || ariaLabel).toBeTruthy();
    }
  });

  test('form inputs should have associated labels', async ({ page }) => {
    await page.goto('http://localhost:3001/login');

    const inputs = page.locator('input');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');

      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        expect(await label.count()).toBeGreaterThan(0);
      } else {
        expect(ariaLabel).toBeTruthy();
      }
    }
  });

  test('color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('http://localhost:3001');
    await injectAxe(page);

    const results = await page.evaluate(() => {
      return (window as any).axe.run({
        rules: ['color-contrast'],
      });
    });

    expect(results.violations).toHaveLength(0);
  });

  test('skip to main content link should be present', async ({ page }) => {
    await page.goto('http://localhost:3001');

    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
  });

  test('focus should be visible on interactive elements', async ({ page }) => {
    await page.goto('http://localhost:3001/login');

    const button = page.locator('button[type="submit"]');
    await button.focus();

    const outline = await button.evaluate((el) => {
      return window.getComputedStyle(el).outline;
    });

    expect(outline).not.toBe('none');
  });
});
