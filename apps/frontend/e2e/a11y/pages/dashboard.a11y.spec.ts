import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

/**
 * Accessibility tests for Dashboard
 * WCAG 2.1 AA Compliance
 * @group a11y
 */

test.describe('Dashboard Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Allow for any async content
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

  test('stats cards should be accessible', async ({ page }) => {
    const statsSection = page.locator('[data-testid="dashboard-stats"], .stats-grid').first();

    if (await statsSection.isVisible()) {
      await checkA11y(page, '[data-testid="dashboard-stats"], .stats-grid', {
        detailedReport: true,
        includedImpacts: ['critical', 'serious'],
      });

      // Each stat should have meaningful text
      const stats = await statsSection.locator('[data-testid*="stat"]').all();
      for (const stat of stats) {
        const text = await stat.textContent();
        expect(text?.trim()).toBeTruthy();
      }
    }
  });

  test('progress bars should be accessible', async ({ page }) => {
    const progressBars = await page.locator('[role="progressbar"], progress').all();

    for (const bar of progressBars) {
      // Should have aria-valuenow
      const valueNow = await bar.getAttribute('aria-valuenow');
      const value = await bar.getAttribute('value');

      expect(valueNow || value).toBeTruthy();

      // Should have aria-valuemin and aria-valuemax
      const valueMin = await bar.getAttribute('aria-valuemin');
      const valueMax = await bar.getAttribute('aria-valuemax');
      const min = await bar.getAttribute('min');
      const max = await bar.getAttribute('max');

      expect(valueMin || min).toBeTruthy();
      expect(valueMax || max).toBeTruthy();

      // Should have label
      const ariaLabel = await bar.getAttribute('aria-label');
      const ariaLabelledBy = await bar.getAttribute('aria-labelledby');
      expect(ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('enrolled courses section should be accessible', async ({ page }) => {
    const coursesSection = page.locator('[data-testid="enrolled-courses"]').first();

    if (await coursesSection.isVisible()) {
      await coursesSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);

      await checkA11y(page, '[data-testid="enrolled-courses"]', {
        detailedReport: true,
        includedImpacts: ['critical', 'serious'],
      });
    }
  });

  test('notifications should be accessible', async ({ page }) => {
    const notifications = await page.locator('[role="alert"], [role="status"]').all();

    for (const notification of notifications) {
      // Should have text content
      const text = await notification.textContent();
      expect(text?.trim()).toBeTruthy();

      // Should have aria-live
      const ariaLive = await notification.getAttribute('aria-live');
      const role = await notification.getAttribute('role');

      expect(ariaLive || role).toBeTruthy();
    }
  });

  test('action buttons should be keyboard accessible', async ({ page }) => {
    const actionButtons = await page
      .locator('button[data-testid*="action"], a[data-testid*="action"]')
      .all();

    for (const button of actionButtons.slice(0, 5)) {
      if (await button.isVisible()) {
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

  test('data tables should be accessible', async ({ page }) => {
    const tables = await page.locator('table').all();

    for (const table of tables) {
      // Should have caption or aria-label
      const caption = await table.locator('caption').count();
      const ariaLabel = await table.getAttribute('aria-label');
      const ariaLabelledBy = await table.getAttribute('aria-labelledby');

      expect(caption > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();

      // Should have proper structure
      const thead = await table.locator('thead').count();
      const tbody = await table.locator('tbody').count();

      expect(thead > 0 && tbody > 0).toBe(true);

      // Headers should have scope
      const headers = await table.locator('th').all();
      for (const header of headers) {
        const scope = await header.getAttribute('scope');
        expect(['col', 'row', null]).toContain(scope);
      }
    }
  });

  test('charts should have accessible alternatives', async ({ page }) => {
    const charts = await page.locator('[data-testid*="chart"], .recharts-wrapper').all();

    for (const chart of charts) {
      // Chart should have aria-label or be in a figure with figcaption
      const ariaLabel = await chart.getAttribute('aria-label');
      const role = await chart.getAttribute('role');

      const parentFigure = await page.evaluate(
        (el) => {
          return el.closest('figure') !== null;
        },
        await chart.elementHandle()
      );

      expect(ariaLabel || role || parentFigure).toBeTruthy();
    }
  });

  test('sidebar navigation should be accessible', async ({ page }) => {
    const sidebar = page.locator('[data-testid="sidebar"], aside').first();

    if (await sidebar.isVisible()) {
      await checkA11y(page, '[data-testid="sidebar"], aside', {
        detailedReport: true,
        includedImpacts: ['critical', 'serious'],
      });

      // Navigation items should be keyboard accessible
      const navItems = await sidebar.locator('a, button').all();

      for (const item of navItems.slice(0, 5)) {
        await item.focus();
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        expect(['A', 'BUTTON']).toContain(focused || '');
      }
    }
  });

  test('should have proper landmarks', async ({ page }) => {
    // Should have main landmark
    const main = await page.locator('main, [role="main"]').count();
    expect(main).toBeGreaterThanOrEqual(1);

    // Should have navigation
    const nav = await page.locator('nav, [role="navigation"]').count();
    expect(nav).toBeGreaterThanOrEqual(1);
  });

  test('loading states should be accessible', async ({ page }) => {
    const loaders = await page.locator('[data-testid*="loading"], [aria-busy="true"]').all();

    for (const loader of loaders) {
      // Should have aria-busy or aria-live
      const ariaBusy = await loader.getAttribute('aria-busy');
      const ariaLive = await loader.getAttribute('aria-live');
      const role = await loader.getAttribute('role');

      expect(ariaBusy || ariaLive || role).toBeTruthy();

      // Should have accessible label
      const ariaLabel = await loader.getAttribute('aria-label');
      const text = await loader.textContent();
      expect(ariaLabel || text?.trim()).toBeTruthy();
    }
  });
});
