/**
 * Test to verify lazy loading configuration for route-level code splitting
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  LAZY_LOAD_ROUTES,
  CORE_ROUTES,
  PREFETCH_ROUTES,
  getLazyRoutesByPriority,
  estimateBundleReduction,
} from '@/config/lazy-routes';

describe('Lazy Loading Routes - Issue #784', () => {
  it('should have lazy-load routes configured', () => {
    expect(LAZY_LOAD_ROUTES.length).toBeGreaterThan(0);
    expect(LAZY_LOAD_ROUTES.length).toBeGreaterThanOrEqual(8);
  });

  it('should have valid route configurations', () => {
    LAZY_LOAD_ROUTES.forEach((route) => {
      expect(route.path).toBeDefined();
      expect(route.path).toMatch(/^\/[a-z\-\/]*$/);
      expect(route.description).toBeDefined();
      expect(route.description.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(route.priority);
      expect(route.estimatedSize).toBeDefined();
      expect(route.reason).toBeDefined();
    });
  });

  it('should have high-priority lazy-load routes', () => {
    const highPriority = getLazyRoutesByPriority('high');
    expect(highPriority.length).toBeGreaterThanOrEqual(2);
    highPriority.forEach((route) => {
      expect(route.priority).toBe('high');
    });
  });

  it('should define core routes that should NOT be lazy-loaded', () => {
    expect(CORE_ROUTES.length).toBeGreaterThan(0);
    CORE_ROUTES.forEach((route) => {
      expect(route).toMatch(/^\/[a-z\-\/]*$/);
    });
  });

  it('should have no overlap between lazy-load and core routes', () => {
    const lazyPaths = LAZY_LOAD_ROUTES.map((r) => r.path);
    const overlaps = CORE_ROUTES.filter((core) => lazyPaths.includes(core));
    expect(overlaps).toEqual([], 'Lazy-load and core routes should not overlap');
  });

  it('should provide bundle reduction estimates', () => {
    const estimate = estimateBundleReduction();
    expect(estimate.routeCount).toBe(LAZY_LOAD_ROUTES.length);
    expect(estimate.highPriorityCount).toBeGreaterThan(0);
    expect(estimate.totalSaved).toBeDefined();
  });

  it('should have prefetch routes defined', () => {
    expect(PREFETCH_ROUTES.length).toBeGreaterThan(0);
    PREFETCH_ROUTES.forEach((route) => {
      expect(route).toMatch(/^\/[a-z\-\/]*$/);
    });
  });

  it('should have dynamic-imports utilities', () => {
    const baseDir = path.resolve(__dirname, '..');
    const dynamicImportsPath = path.resolve(baseDir, 'src/lib/dynamic-imports.ts');
    expect(fs.existsSync(dynamicImportsPath)).toBe(true, 'dynamic-imports.ts should exist');
  });

  it('dynamic-imports should export lazy-loaded components', () => {
    const baseDir = path.resolve(__dirname, '..');
    const dynamicImportsPath = path.resolve(baseDir, 'src/lib/dynamic-imports.ts');
    const content = fs.readFileSync(dynamicImportsPath, 'utf-8');

    const expectedExports = [
      'AdminDashboard',
      'InstructorDashboard',
      'GovernancePanel',
      'SettingsPage',
      'ForumPage',
      'NotificationsPage',
      'DashboardPage',
      'LeaderboardPage',
    ];

    expectedExports.forEach((exportName) => {
      expect(content).toContain(`export const ${exportName}`, `Should export ${exportName}`);
      expect(content).toContain('dynamic(', 'Should use next/dynamic for lazy loading');
    });
  });
});
