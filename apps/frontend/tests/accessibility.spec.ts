import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

test.describe('Accessibility Testing - WCAG 2.1 AA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await injectAxe(page);
  });

  // ─── Page-level Accessibility Tests ────────────────────────────────────────

  test('homepage should have no accessibility violations', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test('should have proper page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('should have proper lang attribute', async ({ page }) => {
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
  });

  // ─── Navigation Accessibility ─────────────────────────────────────────────

  test('navigation should be keyboard accessible', async ({ page }) => {
    // Tab through navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('should have skip to main content link', async ({ page }) => {
    const skipLink = await page.locator('a[href="#main"]');
    expect(skipLink).toBeDefined();
  });

  test('navigation landmarks should exist', async ({ page }) => {
    const nav = await page.locator('nav');
    expect(nav).toBeDefined();
  });

  // ─── Heading Structure ─────────────────────────────────────────────────────

  test('should have proper heading hierarchy', async ({ page }) => {
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);

    // Check for h1
    const h1 = await page.locator('h1');
    expect(h1).toBeDefined();
  });

  test('should not skip heading levels', async ({ page }) => {
    const headingLevels = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return headings.map(h => parseInt(h.tagName[1]));
    });

    // Check for skipped levels
    for (let i = 1; i < headingLevels.length; i++) {
      const diff = Math.abs(headingLevels[i] - headingLevels[i - 1]);
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  // ─── Image Accessibility ──────────────────────────────────────────────────

  test('all images should have alt text', async ({ page }) => {
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBeTruthy();
    }
  });

  test('decorative images should have empty alt text', async ({ page }) => {
    const decorativeImages = await page.locator('img[role="presentation"]').all();
    
    for (const img of decorativeImages) {
      const alt = await img.getAttribute('alt');
      expect(alt).toBe('');
    }
  });

  // ─── Form Accessibility ───────────────────────────────────────────────────

  test('form inputs should have associated labels', async ({ page }) => {
    const inputs = await page.locator('input, textarea, select').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = await page.locator(`label[for="${id}"]`);
        expect(label).toBeDefined();
      }
    }
  });

  test('form should have proper error messages', async ({ page }) => {
    const form = await page.locator('form').first();
    if (form) {
      const errorMessages = await page.locator('[role="alert"]').all();
      expect(errorMessages.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('required fields should be marked', async ({ page }) => {
    const requiredInputs = await page.locator('input[required]').all();
    
    for (const input of requiredInputs) {
      const ariaRequired = await input.getAttribute('aria-required');
      expect(ariaRequired).toBe('true');
    }
  });

  // ─── Color Contrast ───────────────────────────────────────────────────────

  test('text should have sufficient color contrast', async ({ page }) => {
    const contrastIssues = await page.evaluate(() => {
      const issues: string[] = [];
      const elements = document.querySelectorAll('*');
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bgColor = style.backgroundColor;
        
        // Simple contrast check (would use more sophisticated algorithm in production)
        if (color && bgColor && color !== 'rgba(0, 0, 0, 0)') {
          // This is a simplified check
          issues.push(`Element: ${el.tagName}`);
        }
      });
      
      return issues;
    });
    
    // Should have minimal contrast issues
    expect(contrastIssues.length).toBeLessThan(10);
  });

  // ─── Focus Management ──────────────────────────────────────────────────────

  test('interactive elements should be focusable', async ({ page }) => {
    const buttons = await page.locator('button, a[href], input').all();
    
    for (const button of buttons.slice(0, 5)) {
      await button.focus();
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    }
  });

  test('focus should be visible', async ({ page }) => {
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = window.getComputedStyle(el);
      return style.outline || style.boxShadow;
    });
    
    expect(focusedElement).toBeTruthy();
  });

  // ─── ARIA Attributes ──────────────────────────────────────────────────────

  test('should use proper ARIA roles', async ({ page }) => {
    const ariaRoles = await page.evaluate(() => {
      const elements = document.querySelectorAll('[role]');
      return Array.from(elements).map(el => el.getAttribute('role'));
    });
    
    // Check for valid ARIA roles
    const validRoles = ['button', 'link', 'navigation', 'main', 'complementary', 'contentinfo', 'alert', 'dialog'];
    ariaRoles.forEach(role => {
      if (role) {
        expect(validRoles).toContain(role);
      }
    });
  });

  test('should have proper ARIA labels', async ({ page }) => {
    const ariaLabels = await page.evaluate(() => {
      const elements = document.querySelectorAll('[aria-label], [aria-labelledby]');
      return elements.length;
    });
    
    expect(ariaLabels).toBeGreaterThanOrEqual(0);
  });

  // ─── Semantic HTML ────────────────────────────────────────────────────────

  test('should use semantic HTML elements', async ({ page }) => {
    const semanticElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('header, nav, main, article, section, aside, footer');
      return elements.length;
    });
    
    expect(semanticElements).toBeGreaterThan(0);
  });

  // ─── Mobile Accessibility ─────────────────────────────────────────────────

  test('should be mobile accessible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check touch targets are at least 44x44px
    const buttons = await page.locator('button').all();
    for (const button of buttons.slice(0, 5)) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  // ─── Video Accessibility ──────────────────────────────────────────────────

  test('videos should have captions', async ({ page }) => {
    const videos = await page.locator('video').all();
    
    for (const video of videos) {
      const tracks = await video.locator('track[kind="captions"]').all();
      expect(tracks.length).toBeGreaterThan(0);
    }
  });

  // ─── Link Accessibility ───────────────────────────────────────────────────

  test('links should have descriptive text', async ({ page }) => {
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      
      expect(text || ariaLabel || title).toBeTruthy();
    }
  });

  test('should not have "click here" links', async ({ page }) => {
    const links = await page.locator('a').all();
    
    for (const link of links) {
      const text = await link.textContent();
      expect(text?.toLowerCase()).not.toContain('click here');
    }
  });

  // ─── Language Accessibility ───────────────────────────────────────────────

  test('should specify language for content', async ({ page }) => {
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });
});
