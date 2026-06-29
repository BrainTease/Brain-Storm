import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

/**
 * Accessibility tests for Homepage
 * WCAG 2.1 AA Compliance
 * @group a11y
 */

test.describe('Homepage Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await injectAxe(page);
  });

  test('should have zero critical accessibility violations', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      includedImpacts: ['critical'],
    });
  });

  test('should have zero serious accessibility violations', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      includedImpacts: ['serious'],
    });
  });

  test('should have minimal moderate violations', async ({ page }) => {
    const violations = await getViolations(page, null, {
      includedImpacts: ['moderate'],
    });
    
    // Allow up to 5 moderate violations (adjust as needed)
    expect(violations.length).toBeLessThanOrEqual(5);
  });

  test('should have proper page structure', async ({ page }) => {
    // Check for main landmark
    const main = await page.locator('main').count();
    expect(main).toBeGreaterThanOrEqual(1);

    // Check for navigation
    const nav = await page.locator('nav').count();
    expect(nav).toBeGreaterThanOrEqual(1);

    // Check for heading hierarchy
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThanOrEqual(1);
    expect(h1).toBeLessThanOrEqual(1); // Only one H1
  });

  test('should have accessible hero section', async ({ page }) => {
    const hero = page.locator('[data-testid="hero-section"], section').first();
    
    if (await hero.isVisible()) {
      await checkA11y(page, '[data-testid="hero-section"], section', {
        detailedReport: true,
        includedImpacts: ['critical', 'serious'],
      });
    }
  });

  test('should have accessible CTA buttons', async ({ page }) => {
    const ctaButtons = await page.locator('button[data-testid*="cta"], a[data-testid*="cta"]').all();
    
    for (const button of ctaButtons) {
      // Each CTA should have text or aria-label
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      expect(text?.trim() || ariaLabel).toBeTruthy();

      // Should be keyboard accessible
      const tabIndex = await button.getAttribute('tabindex');
      expect(tabIndex === null || parseInt(tabIndex) >= 0).toBe(true);
    }
  });

  test('should have accessible features section', async ({ page }) => {
    const features = page.locator('[data-testid="features-section"]').first();
    
    if (await features.isVisible()) {
      await features.scrollIntoViewIfNeeded();
      await checkA11y(page, '[data-testid="features-section"]', {
        detailedReport: true,
        includedImpacts: ['critical', 'serious'],
      });
    }
  });

  test('all images should have alt text', async ({ page }) => {
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Image should have alt text (empty for decorative)
      expect(alt !== null).toBe(true);
      
      // If decorative, should have empty alt or role="presentation"
      if (role === 'presentation' || alt === '') {
        // Decorative image - this is fine
      } else {
        // Informative image - should have meaningful alt
        expect(alt).toBeTruthy();
      }
    }
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Get all interactive elements
    const interactiveElements = await page.locator(
      'a, button, input, select, textarea, [tabindex="0"]'
    ).all();

    expect(interactiveElements.length).toBeGreaterThan(0);

    // Tab through first few elements
    for (let i = 0; i < Math.min(5, interactiveElements.length); i++) {
      await page.keyboard.press('Tab');
      
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName,
          hasOutline: window.getComputedStyle(el as HTMLElement).outline !== 'none'
        };
      });

      expect(focused.tag).toBeTruthy();
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    const firstButton = page.locator('button, a[href]').first();
    
    if (await firstButton.isVisible()) {
      await firstButton.focus();
      
      const focusStyle = await firstButton.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          outline: style.outline,
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow
        };
      });

      // Should have some focus indicator
      const hasFocusIndicator = 
        focusStyle.outlineWidth !== '0px' ||
        focusStyle.boxShadow !== 'none';
      
      expect(hasFocusIndicator).toBe(true);
    }
  });

  test('should have proper color contrast', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      rules: {
        'color-contrast': { enabled: true }
      },
      includedImpacts: ['serious', 'critical'],
    });
  });

  test('should have proper language attribute', async ({ page }) => {
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });

  test('should have meaningful page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toBe('React App'); // Default title
  });
});
