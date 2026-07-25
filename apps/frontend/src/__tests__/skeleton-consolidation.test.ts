/**
 * Test to verify skeleton components are properly consolidated
 * Ensures no duplicate definitions and proper exports
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Skeleton Consolidation - Issue #782', () => {
  it('should not have duplicate component definitions in Skeleton.tsx', () => {
    const baseDir = path.resolve(__dirname, '..');
    const skeletonPath = path.resolve(baseDir, 'src/components/ui/Skeleton.tsx');
    const content = fs.readFileSync(skeletonPath, 'utf-8');

    // Count occurrences of CourseDetailSkeleton export
    const courseDetailMatches = content.match(/export const CourseDetailSkeleton/g) || [];
    expect(courseDetailMatches.length).toBe(1, 'CourseDetailSkeleton should be defined only once');

    // Count occurrences of other skeleton exports
    const courseListMatches = content.match(/export const CourseListSkeleton/g) || [];
    expect(courseListMatches.length).toBe(1, 'CourseListSkeleton should be defined only once');

    const dashboardMatches = content.match(/export const DashboardSkeleton/g) || [];
    expect(dashboardMatches.length).toBe(1, 'DashboardSkeleton should be defined only once');
  });

  it('should export shared skeleton components', () => {
    const baseDir = path.resolve(__dirname, '..');
    const sharedSkeletonsPath = path.resolve(baseDir, 'src/components/ui/SharedSkeletons.tsx');
    const content = fs.readFileSync(sharedSkeletonsPath, 'utf-8');

    const expectedExports = [
      'ListSkeleton',
      'GridSkeleton',
      'DetailPageSkeleton',
      'StatsSkeleton',
      'FormSkeleton',
      'TableSkeleton',
    ];

    expectedExports.forEach((exportName) => {
      expect(content).toContain(`export const ${exportName}`, `Should export ${exportName}`);
    });
  });

  it('LoadingState should use consolidated skeletons', () => {
    const baseDir = path.resolve(__dirname, '..');
    const loadingStatePath = path.resolve(baseDir, 'src/components/ui/LoadingState.tsx');
    const content = fs.readFileSync(loadingStatePath, 'utf-8');

    // Should import from Skeleton.tsx
    expect(content).toContain("from './Skeleton'");
    // Should have type definitions for loading states
    expect(content).toContain("type: 'course-list' | 'course-detail' | 'dashboard' | 'default'");
  });
});
