import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y, getViolations } from 'axe-playwright';

/**
 * Accessibility tests for Courses Page
 * WCAG 2.1 AA Compliance
 * @group a11y
 */

test.describe('Courses Page Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/courses');
    await page.waitForLoadState('networkidle');
    await injectAxe(page);
  });

  test('should have zero critical accessibility violations', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      includedImpacts: ['critical'],
    });
  });

  test('should have zero serious accessibility violations', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      includedImpacts: ['serious'],
    });
  });

  test('course cards should be accessible', async ({ page }) => {
    const courseCards = await page.locator('[data-testid="course-card"]').all();
    
    expect(courseCards.length).toBeGreaterThan(0);

    for (const card of courseCards.slice(0, 3)) {
      // Each card should have a heading
      const heading = await card.locator('h2, h3, h4').count();
      expect(heading).toBeGreaterThan(0);

      // Check card for violations
      const cardId = await card.getAttribute('data-testid');
      if (cardId) {
        await checkA11y(page, `[data-testid="${cardId}"]`, {
          detailedReport: true,
          includedImpacts: ['critical', 'serious'],
        });
      }
    }
  });

  test('search input should be accessible', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    
    if (await searchInput.isVisible()) {
      // Should have label or aria-label
      const id = await searchInput.getAttribute('id');
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const ariaLabelledBy = await searchInput.getAttribute('aria-labelledby');
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }

      // Should be keyboard accessible
      await searchInput.focus();
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBe('INPUT');
    }
  });

  test('filter controls should be accessible', async ({ page }) => {
    const filterButton = page.locator('[data-testid="filter-button"], button:has-text("Filter")').first();
    
    if (await filterButton.isVisible()) {
      // Should have accessible name
      const text = await filterButton.textContent();
      const ariaLabel = await filterButton.getAttribute('aria-label');
      expect(text?.trim() || ariaLabel).toBeTruthy();

      // If expandable, should have aria-expanded
      await filterButton.click();
      await page.waitForTimeout(300);
      
      const ariaExpanded = await filterButton.getAttribute('aria-expanded');
      if (ariaExpanded !== null) {
        expect(['true', 'false']).toContain(ariaExpanded);
      }
    }
  });

  test('course grid should have proper structure', async ({ page }) => {
    const grid = page.locator('[data-testid="course-grid"], .grid, [role="list"]').first();
    
    if (await grid.isVisible()) {
      await checkA11y(page, '[data-testid="course-grid"], .grid', {
        detailedReport: true,
        includedImpacts: ['critical', 'serious'],
      });
    }
  });

  test('pagination should be keyboard accessible', async ({ page }) => {
    const pagination = page.locator('[data-testid="pagination"], nav[aria-label*="pagination"]').first();
    
    if (await pagination.isVisible()) {
      const buttons = await pagination.locator('button, a').all();
      
      for (const button of buttons) {
        // Should be focusable
        await button.focus();
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        expect(['BUTTON', 'A']).toContain(focused || '');

        // Should have accessible name
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text?.trim() || ariaLabel).toBeTruthy();
      }
    }
  });

  test('empty state should be accessible', async ({ page }) => {
    // Trigger empty state
    const searchInput = page.locator('input[type="search"]').first();
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('xyznonexistentcourse999');
      await page.waitForTimeout(500);

      const emptyState = page.locator('[data-testid="empty-state"], .empty-state').first();
      
      if (await emptyState.isVisible()) {
        await checkA11y(page, '[data-testid="empty-state"], .empty-state', {
          detailedReport: true,
          includedImpacts: ['critical', 'serious'],
        });
      }
    }
  });

  test('course links should have descriptive text', async ({ page }) => {
    const courseLinks = await page.locator('a[href*="/courses/"]').all();
    
    for (const link of courseLinks.slice(0, 5)) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const title = await link.getAttribute('title');
      
      const linkText = text?.trim() || ariaLabel || title;
      expect(linkText).toBeTruthy();
      
      // Should not be generic
      expect(linkText?.toLowerCase()).not.toContain('click here');
      expect(linkText?.toLowerCase()).not.toBe('read more');
    }
  });

  test('enrollment buttons should be accessible', async ({ page }) => {
    const enrollButtons = await page.locator('[data-testid*="enroll"], button:has-text("Enroll")').all();
    
    for (const button of enrollButtons.slice(0, 3)) {
      if (await button.isVisible()) {
        // Should have accessible name
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        expect(text?.trim() || ariaLabel).toBeTruthy();

        // Should be keyboard accessible
        await button.focus();
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        expect(focused).toBe('BUTTON');
      }
    }
  });
});
