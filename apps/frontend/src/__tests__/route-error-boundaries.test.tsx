/**
 * Issue #1283: Standardize error boundaries per route
 * Every route segment that renders a page must be covered by an error
 * boundary (its own error.tsx or an ancestor's), and the shared
 * ErrorBoundary component must render its fallback when a child throws.
 */

import fs from 'fs';
import path from 'path';

import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const APP_DIR = path.resolve(__dirname, '../app');

const routesWithPages = (dir: string, out: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (fs.existsSync(path.join(full, 'page.tsx'))) out.push(full);
    routesWithPages(full, out);
  }
  return out;
};

const hasBoundary = (route: string): boolean => {
  let current = route;
  while (current.startsWith(APP_DIR)) {
    if (fs.existsSync(path.join(current, 'error.tsx'))) return true;
    if (current === APP_DIR) break;
    current = path.dirname(current);
  }
  return false;
};

const Thrower = (): ReactElement => {
  throw new Error('boom');
};

describe('Route error boundaries - Issue #1283', () => {
  it('every route with a page is covered by an error boundary', () => {
    const uncovered = routesWithPages(APP_DIR)
      .filter((route) => !hasBoundary(route))
      .map((route) => path.relative(APP_DIR, route));
    expect(uncovered).toEqual([]);
  });

  it('the root error.tsx exists as the catch-all boundary', () => {
    expect(fs.existsSync(path.join(APP_DIR, 'error.tsx'))).toBe(true);
  });

  it('shared ErrorBoundary renders the fallback when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        <ErrorBoundary fallback={<div>fallback shown</div>}>
          <Thrower />
        </ErrorBoundary>
      );
    });
    expect(container.textContent).toContain('fallback shown');
    act(() => root.unmount());
    container.remove();
    spy.mockRestore();
  });
});
