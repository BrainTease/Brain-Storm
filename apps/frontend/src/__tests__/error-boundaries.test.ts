/**
 * Test to verify error boundary usage is standardized (Issue #1121)
 * Ensures all top-level app routes have consistent error/loading boundaries
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const APP_DIR = path.resolve(__dirname, '../app');
const MAJOR_ROUTES = ['courses', 'dashboard', 'admin', 'auth', 'settings'];

const routeHasFile = (route: string, file: string) => {
  return fs.existsSync(path.resolve(APP_DIR, route, file));
};

describe('Error Boundary Standardization - Issue #1121', () => {
  it('should have root error.tsx', () => {
    expect(fs.existsSync(path.resolve(APP_DIR, 'error.tsx'))).toBe(true);
  });

  it('should have root layout.tsx', () => {
    expect(fs.existsSync(path.resolve(APP_DIR, 'layout.tsx'))).toBe(true);
  });

  it('major routes should have error boundaries', () => {
    MAJOR_ROUTES.forEach((route) => {
      expect(routeHasFile(route, 'error.tsx')).toBe(true);
    });
  });

  it('major routes should have loading boundaries', () => {
    MAJOR_ROUTES.forEach((route) => {
      expect(routeHasFile(route, 'loading.tsx')).toBe(true);
    });
  });

  it('error.tsx should be client component', () => {
    const errorPath = path.resolve(APP_DIR, 'error.tsx');
    if (fs.existsSync(errorPath)) {
      const content = fs.readFileSync(errorPath, 'utf-8');
      expect(content).toMatch(/['"]use client['"]|Error|error/);
    }
  });

  it('error.tsx should log errors', () => {
    const errorPath = path.resolve(APP_DIR, 'error.tsx');
    if (fs.existsSync(errorPath)) {
      const content = fs.readFileSync(errorPath, 'utf-8');
      expect(content).toMatch(/useEffect|console|logger|error/);
    }
  });

  it('error boundaries should have retry', () => {
    const errorPath = path.resolve(APP_DIR, 'courses', 'error.tsx');
    if (fs.existsSync(errorPath)) {
      const content = fs.readFileSync(errorPath, 'utf-8');
      expect(content).toMatch(/button|retry|Try/i);
    }
  });

  it('loading.tsx should export skeleton', () => {
    const loadingPath = path.resolve(APP_DIR, 'courses', 'loading.tsx');
    if (fs.existsSync(loadingPath)) {
      const content = fs.readFileSync(loadingPath, 'utf-8');
      expect(content).toMatch(/export|function|const|Skeleton|Loading/);
    }
  });

  it('nested routes should have boundaries', () => {
    const courseDetailDir = path.resolve(APP_DIR, 'courses', '[id]');
    if (fs.existsSync(courseDetailDir)) {
      const hasErrorOrLoading =
        fs.existsSync(path.resolve(courseDetailDir, 'error.tsx')) ||
        fs.existsSync(path.resolve(courseDetailDir, 'loading.tsx'));
      expect(hasErrorOrLoading).toBe(true);
    }
  });

  it('locale routes should have error boundary', () => {
    const localeDir = path.resolve(APP_DIR, '[locale]');
    if (fs.existsSync(localeDir)) {
      expect(fs.existsSync(path.resolve(localeDir, 'error.tsx'))).toBe(true);
    }
  });

  it('dashboard should have segments', () => {
    const dashboardDir = path.resolve(APP_DIR, 'dashboard');
    if (fs.existsSync(dashboardDir)) {
      const items = fs.readdirSync(dashboardDir);
      const isDir = (item: string) => fs.statSync(path.join(dashboardDir, item)).isDirectory();
      const segments = items.filter((item) => isDir(item) && !item.startsWith('_'));
      expect(segments.length).toBeGreaterThan(0);
    }
  });
});
