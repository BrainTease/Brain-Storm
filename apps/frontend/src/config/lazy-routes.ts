/**
 * Lazy loading configuration for route-level code splitting
 * Identifies routes that benefit from lazy loading and provides metadata
 */

export interface LazyRouteConfig {
  path: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  estimatedSize: string; // Approximate bundle size
  reason: string; // Why this route should be lazy-loaded
}

/**
 * Routes that should use lazy loading for better initial load performance
 */
export const LAZY_LOAD_ROUTES: LazyRouteConfig[] = [
  {
    path: '/admin',
    description: 'Admin Dashboard',
    priority: 'high',
    estimatedSize: '150-200 KB',
    reason: 'Admin-only route with heavy analytics, charts, and data tables',
  },
  {
    path: '/instructor/dashboard',
    description: 'Instructor Dashboard',
    priority: 'high',
    estimatedSize: '100-150 KB',
    reason: 'Instructor-only route with course management and analytics',
  },
  {
    path: '/instructor/courses/new',
    description: 'Course Creation Wizard',
    priority: 'medium',
    estimatedSize: '80-120 KB',
    reason: 'Complex form with rich editor and file upload capabilities',
  },
  {
    path: '/governance',
    description: 'Governance Panel',
    priority: 'medium',
    estimatedSize: '80-100 KB',
    reason: 'Token-gated voting and proposal management',
  },
  {
    path: '/settings',
    description: 'Settings Page',
    priority: 'low',
    estimatedSize: '50-80 KB',
    reason: 'User settings and preferences - not needed on initial load',
  },
  {
    path: '/forum',
    description: 'Forum Discussion',
    priority: 'medium',
    estimatedSize: '70-100 KB',
    reason: 'Discussion threads with nested replies and voting',
  },
  {
    path: '/notifications',
    description: 'Notifications Center',
    priority: 'low',
    estimatedSize: '40-60 KB',
    reason: 'Notification history and preferences',
  },
  {
    path: '/leaderboard',
    description: 'Leaderboard',
    priority: 'low',
    estimatedSize: '60-80 KB',
    reason: 'Ranked user list with avatars and scores',
  },
  {
    path: '/credentials',
    description: 'Credentials Management',
    priority: 'medium',
    estimatedSize: '50-70 KB',
    reason: 'Blockchain credential verification and display',
  },
  {
    path: '/bookmarks',
    description: 'Saved Bookmarks',
    priority: 'low',
    estimatedSize: '40-60 KB',
    reason: 'User-specific bookmark collection',
  },
];

/**
 * Get lazy-load candidates for a specific priority
 */
export function getLazyRoutesByPriority(priority: LazyRouteConfig['priority']): LazyRouteConfig[] {
  return LAZY_LOAD_ROUTES.filter((route) => route.priority === priority);
}

/**
 * Calculate estimated total bundle reduction if all lazy routes are implemented
 */
export function estimateBundleReduction(): {
  totalSaved: string;
  routeCount: number;
  highPriorityCount: number;
} {
  const highPriority = getLazyRoutesByPriority('high');
  return {
    totalSaved: '400-600 KB',
    routeCount: LAZY_LOAD_ROUTES.length,
    highPriorityCount: highPriority.length,
  };
}

/**
 * Prefetch configuration for routes that should be preloaded
 */
export const PREFETCH_ROUTES = [
  '/dashboard', // Main dashboard - should load quickly
  '/courses', // Course listing - primary content
  '/profile', // User profile - frequently accessed
];

/**
 * Routes that should NOT be lazy-loaded (core routes)
 */
export const CORE_ROUTES = [
  '/', // Home page
  '/courses', // Course listing
  '/dashboard', // Main dashboard
  '/profile', // Profile page
  '/auth/login', // Login
  '/auth/register', // Registration
];
