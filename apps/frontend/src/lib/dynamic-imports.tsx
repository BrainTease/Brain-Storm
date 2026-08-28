/**
 * Dynamic import utilities for code-splitting at route level
 * Improves initial load performance by lazy-loading heavy route components
 */

import dynamic from 'next/dynamic';
import React from 'react';

/**
 * Creates a dynamic import with loading and error fallback
 */
function createDynamicComponent<P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  loadingComponent?: React.ComponentType
) {
  return dynamic(importFunc, {
    loading: loadingComponent || (() => <div>Loading...</div>),
    ssr: true, // Enable server-side rendering by default for better SEO
  });
}

/**
 * Admin-heavy components with dynamic imports
 */
export const AdminDashboard = dynamic(() => import('@/components/Admin/Dashboard/AdminDashboard'), {
  ssr: false,
  loading: () => <div>Loading admin dashboard...</div>,
});

/**
 * Instructor/course creation components
 */
export const InstructorDashboard = dynamic(
  () =>
    import('@/components/instructor').then(
      (mod) => mod.InstructorDashboard || { default: () => null }
    ),
  {
    ssr: false,
    loading: () => <div>Loading instructor dashboard...</div>,
  }
);

/**
 * Analytics and governance components
 */
export const GovernancePanel = dynamic(
  () =>
    import('@/components/governance').then((mod) => mod.GovernancePanel || { default: () => null }),
  {
    ssr: true,
    loading: () => <div>Loading governance panel...</div>,
  }
);

/**
 * Settings and configuration components
 */
export const SettingsPage = dynamic(
  () => import('@/components/settings').then((mod) => mod.SettingsPage || { default: () => null }),
  {
    ssr: true,
    loading: () => <div>Loading settings...</div>,
  }
);

/**
 * Forum and discussion components
 */
export const ForumPage = dynamic(
  () => import('@/components/forum').then((mod) => mod.ForumPage || { default: () => null }),
  {
    ssr: true,
    loading: () => <div>Loading forum...</div>,
  }
);

/**
 * Notifications and messaging components
 */
export const NotificationsPage = dynamic(
  () =>
    import('@/components/notifications').then(
      (mod) => mod.NotificationsPage || { default: () => null }
    ),
  {
    ssr: true,
    loading: () => <div>Loading notifications...</div>,
  }
);

/**
 * Dashboard and analytics components
 */
export const DashboardPage = dynamic(
  () =>
    import('@/components/dashboard').then((mod) => mod.DashboardPage || { default: () => null }),
  {
    ssr: true,
    loading: () => <div>Loading dashboard...</div>,
  }
);

/**
 * Leaderboard and stats components
 */
export const LeaderboardPage = dynamic(
  () =>
    import('@/components/leaderboard').then(
      (mod) => mod.LeaderboardPage || { default: () => null }
    ),
  {
    ssr: true,
    loading: () => <div>Loading leaderboard...</div>,
  }
);

export default createDynamicComponent;
