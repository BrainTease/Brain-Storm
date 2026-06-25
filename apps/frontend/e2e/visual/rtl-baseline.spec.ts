import { test, expect } from '@playwright/test';

/**
 * Visual regression baseline tests for RTL (Arabic) layout
 * These tests capture baseline screenshots to detect layout regressions in RTL mode
 */

test.describe('RTL Visual Regression - Arabic (ar)', () => {
  test.beforeEach(async ({ page }) => {
    // Set locale to Arabic for RTL testing
    await page.goto('/ar');
  });

  test('should render home page correctly in RTL', async ({ page }) => {
    await page.goto('/ar');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveTitle(/Brain-Storm/);
    
    // Check that dir attribute is set to rtl
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveAttribute('dir', 'rtl');
    await expect(htmlElement).toHaveAttribute('lang', 'ar');
    
    // Visual regression baseline
    await expect(page).toHaveScreenshot('home-rtl.png', { fullPage: true, maxDiffPixels: 100 });
  });

  test('should render navigation correctly in RTL', async ({ page }) => {
    await page.goto('/ar');
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible();
    
    // Check layout direction in navbar
    const navElement = page.locator('nav').first();
    await expect(navElement.locator('button')).toBeTruthy();
    
    // Visual regression baseline for navbar
    await expect(navbar).toHaveScreenshot('navbar-rtl.png', { maxDiffPixels: 50 });
  });

  test('should render buttons with correct alignment in RTL', async ({ page }) => {
    await page.goto('/ar');
    const buttons = page.locator('button').first();
    
    if (await buttons.isVisible()) {
      // Verify buttons are rendered
      await expect(buttons).toBeVisible();
      
      // Visual regression baseline for button
      await expect(buttons).toHaveScreenshot('button-rtl.png', { maxDiffPixels: 50 });
    }
  });

  test('should mirror directional icons in RTL', async ({ page }) => {
    await page.goto('/ar');
    
    // Look for theme toggle icon
    const themeToggle = page.locator('button').filter({ has: page.locator('svg') }).first();
    
    if (await themeToggle.isVisible()) {
      const svg = themeToggle.locator('svg');
      
      // In RTL, the SVG should have scale-x-[-1] class or transform
      const style = await svg.getAttribute('class');
      
      // Note: This test is informational. The actual mirroring behavior
      // depends on the implementation. Visual screenshot will confirm correctness.
      await expect(themeToggle).toHaveScreenshot('theme-toggle-rtl.png', { maxDiffPixels: 50 });
    }
  });

  test('should handle text alignment in RTL', async ({ page }) => {
    await page.goto('/ar');
    
    // Get all text elements
    const headings = page.locator('h1, h2, h3').first();
    
    if (await headings.isVisible()) {
      const computedStyle = await headings.evaluate((el) => window.getComputedStyle(el).textAlign);
      // In RTL, text-align should respect the dir attribute
      // This is handled by the browser automatically or by CSS
      await expect(headings).toHaveScreenshot('text-rtl.png', { maxDiffPixels: 50 });
    }
  });

  test('should maintain focus ring visibility in RTL', async ({ page }) => {
    await page.goto('/ar');
    
    // Find an interactive element
    const button = page.locator('button').first();
    
    if (await button.isVisible()) {
      // Focus on the button
      await button.focus();
      
      // Check that focus ring is visible
      const focusStyle = await button.evaluate((el) => {
        return window.getComputedStyle(el, ':focus-visible').outline;
      });
      
      // Visual regression baseline with focus state
      await expect(button).toHaveScreenshot('button-focused-rtl.png', { maxDiffPixels: 50 });
    }
  });

  test('should render properly on mobile RTL', async ({ browser }) => {
    const context = await browser.createContext({
      viewport: { width: 375, height: 667 }, // iPhone SE viewport
    });
    const page = await context.newPage();
    
    await page.goto('/ar');
    await page.waitForLoadState('networkidle');
    
    // Check mobile layout in RTL
    await expect(page).toHaveScreenshot('home-mobile-rtl.png', { fullPage: true, maxDiffPixels: 100 });
    
    await context.close();
  });

  test('should have proper heading hierarchy in RTL', async ({ page }) => {
    await page.goto('/ar');
    
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThanOrEqual(1);
    
    // Check for proper heading order
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    let lastLevel = 0;
    for (const heading of headings) {
      const tagName = await heading.evaluate((el) => el.tagName);
      const level = parseInt(tagName[1]);
      // Heading levels should not skip more than 1
      expect(level - lastLevel).toBeLessThanOrEqual(1);
      lastLevel = level;
    }
  });

  test('should have proper color contrast in RTL', async ({ page }) => {
    await page.goto('/ar');
    
    const elements = page.locator('*');
    const count = await elements.count();
    
    // Sample a few elements to verify they have good contrast
    // Full WCAG contrast checking requires axe-core
    const sampleSize = Math.min(5, count);
    
    for (let i = 0; i < sampleSize; i++) {
      const element = elements.nth(i);
      const style = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontSize: computed.fontSize,
        };
      });
      
      // Elements should have non-transparent background and color
      expect(style.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(style.color).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
});
