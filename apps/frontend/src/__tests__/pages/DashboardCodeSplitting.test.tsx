// @vitest-environment jsdom
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

type DynamicOptions = { loading?: () => React.ReactNode };
type DynamicCall = { source: string; options: DynamicOptions };

// Capture every next/dynamic call; the loader source identifies which section it splits
const dynamicCalls: DynamicCall[] = [];

vi.mock('next/dynamic', () => ({
  default: (loader: () => unknown, options: DynamicOptions) => {
    dynamicCalls.push({ source: loader.toString(), options });
    return () => null;
  },
}));

function findSplit(name: string) {
  const call = dynamicCalls.find((c) => c.source.includes(name));
  expect(call, `${name} should be loaded with next/dynamic`).toBeDefined();
  return call!.options;
}

vi.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({
    user: undefined,
    tokenBalance: 0,
    enrolledCourses: [],
    credentials: [],
    isLoading: false,
    error: undefined,
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;

beforeEach(async () => {
  // Skeleton reads prefers-reduced-motion via matchMedia, which jsdom lacks
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  dynamicCalls.length = 0;
  vi.resetModules();
  await import('../../app/dashboard/page');
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  container.remove();
});

function renderFallback(name: string) {
  const loading = findSplit(name).loading;
  expect(loading).toBeTypeOf('function');
  const root = createRoot(container);
  act(() => {
    root.render(createElement('div', null, loading!()));
  });
  const html = container.innerHTML;
  act(() => root.unmount());
  return html;
}

describe('Dashboard route code splitting', () => {
  it('lazy-loads the course list and the credential list', () => {
    findSplit('CourseProgressList');
    findSplit('RecentCredentialList');
  });

  it('shows a skeleton while the course section loads', () => {
    expect(renderFallback('CourseProgressList')).toContain('animate-pulse');
  });

  it('shows a skeleton while the credential section loads', () => {
    expect(renderFallback('RecentCredentialList')).toContain('animate-pulse');
  });
});
