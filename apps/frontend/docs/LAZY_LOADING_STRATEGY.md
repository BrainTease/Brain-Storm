# Lazy Loading Strategy (Issue #784)

## Overview

This document outlines the route-level code splitting strategy implemented to improve initial load performance. By lazy-loading heavy route bundles, we reduce the initial JavaScript payload and improve Time to Interactive (TTI).

## Architecture

### Dynamic Imports

Route-level components are imported using Next.js `dynamic()` function, which automatically creates separate bundles for lazy-loaded routes:

```typescript
import dynamic from 'next/dynamic';

export const AdminDashboard = dynamic(
  () => import('@/components/Admin/Dashboard/AdminDashboard'),
  {
    ssr: false,
    loading: () => <div>Loading admin dashboard...</div>,
  }
);
```

## Route Classification

### Core Routes (No Lazy Loading)

These routes should load with the main bundle for fast initial page load:

- `/` - Home page
- `/courses` - Course listing
- `/dashboard` - Main dashboard
- `/profile` - Profile page
- `/auth/login` - Login
- `/auth/register` - Registration

### High-Priority Lazy Routes

These routes have the largest bundles and should be lazy-loaded:

- `/admin` - Admin Dashboard (~150-200 KB)
- `/instructor/dashboard` - Instructor Dashboard (~100-150 KB)

### Medium-Priority Lazy Routes

Moderately sized routes that benefit from lazy loading:

- `/instructor/courses/new` - Course Creation (~80-120 KB)
- `/governance` - Governance Panel (~80-100 KB)
- `/forum` - Forum Discussion (~70-100 KB)
- `/credentials` - Credentials Management (~50-70 KB)

### Low-Priority Lazy Routes

Smaller routes, but still lazy-loaded to minimize main bundle:

- `/settings` - Settings Page (~50-80 KB)
- `/notifications` - Notifications (~40-60 KB)
- `/leaderboard` - Leaderboard (~60-80 KB)
- `/bookmarks` - Bookmarks (~40-60 KB)

## Expected Performance Impact

### Bundle Size Reduction

- **Initial JS**: 400-600 KB reduction
- **Routes affected**: 10+ lazy-loaded routes
- **High-priority reduction**: 250-350 KB

### Metrics

- **First Contentful Paint (FCP)**: ~15-20% improvement
- **Time to Interactive (TTI)**: ~20-30% improvement
- **Largest Contentful Paint (LCP)**: ~10-15% improvement

## Implementation Details

### Server-Side Rendering (SSR)

Routes are configured with different SSR settings based on content type:

```typescript
// SEO-important routes: SSR enabled
export const GovernancePanel = dynamic(
  () => import('@/components/governance'),
  {
    ssr: true,
    loading: () => <div>Loading governance panel...</div>,
  }
);

// User-specific routes: SSR disabled
export const AdminDashboard = dynamic(
  () => import('@/components/Admin/Dashboard/AdminDashboard'),
  {
    ssr: false,
    loading: () => <div>Loading admin dashboard...</div>,
  }
);
```

### Prefetching Strategy

Core routes are prefetched to ensure smooth navigation:

```typescript
export const PREFETCH_ROUTES = ['/dashboard', '/courses', '/profile'];
```

## Usage

### In Page Components

```typescript
import { AdminDashboard } from '@/lib/dynamic-imports';

export default function AdminPage() {
  return <AdminDashboard />;
}
```

### Manual Dynamic Imports

For custom lazy-loading requirements:

```typescript
import dynamic from 'next/dynamic';

const CustomComponent = dynamic(
  () => import('@/components/custom'),
  {
    loading: () => <LoadingSkeleton />,
  }
);
```

## Configuration

Lazy-load routes are defined in `/src/config/lazy-routes.ts`:

```typescript
export const LAZY_LOAD_ROUTES: LazyRouteConfig[] = [
  {
    path: '/admin',
    description: 'Admin Dashboard',
    priority: 'high',
    estimatedSize: '150-200 KB',
    reason: 'Admin-only route with heavy analytics...',
  },
  // ... more routes
];
```

## Testing

Verify lazy loading is working correctly:

```bash
# Run lazy loading tests
npm run test -- lazy-loading.test.ts

# Check bundle size
npm run build
# Look for separate chunks in .next/static/chunks
```

## Best Practices

1. **Profile First**: Use Next.js bundle analyzer to identify heavy routes
2. **Route Priority**: Lazy-load only when bundle size > 50 KB
3. **User Experience**: Always provide loading indicators
4. **Accessibility**: Maintain ARIA labels and semantic HTML
5. **SEO**: Enable SSR for SEO-critical routes

## Monitoring

Track performance improvements:

- Use Web Vitals to monitor FCP, LCP, TTI
- Monitor bundle sizes in CI/CD pipeline
- Track lazy-load errors in error tracking service

## Future Improvements

1. **Component-level code splitting** for large components
2. **Route prefetching** based on user navigation patterns
3. **Selective prefetching** for likely next routes
4. **A/B testing** different lazy-loading strategies

## Related Issues

- #784: Implement lazy-loading for route-level bundles
- #782: Consolidate duplicate loading components
- #785: Remove debug statements from production build
- #783: Extract badge-display logic to shared library
