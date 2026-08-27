/**
 * Shared skeleton components for common loading states
 * Provides a unified loading experience across the application
 */

import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Generic loading list skeleton
 */
export const ListSkeleton: React.FC<{ count?: number; itemHeight?: number }> = ({
  count = 5,
  itemHeight = 80,
}) => (
  <div className="space-y-3" role="status" aria-label="Loading items">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border rounded-lg p-4">
        <Skeleton height={itemHeight} className="w-full" />
      </div>
    ))}
  </div>
);

/**
 * Generic grid skeleton
 */
export const GridSkeleton: React.FC<{
  columns?: number;
  count?: number;
  itemHeight?: number;
}> = ({ columns = 3, count = 6, itemHeight = 200 }) => (
  <div
    className={`grid gap-4 grid-cols-1 md:grid-cols-${columns}`}
    role="status"
    aria-label="Loading grid items"
  >
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton height={itemHeight} className="w-full" />
        <Skeleton height={20} width="80%" />
        <Skeleton height={16} width="60%" />
      </div>
    ))}
  </div>
);

/**
 * Detail page skeleton with header and content sections
 */
export const DetailPageSkeleton: React.FC<{ hasAside?: boolean }> = ({ hasAside = true }) => (
  <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" aria-busy="true" role="status">
    {/* Header */}
    <div className="space-y-4">
      <Skeleton height={40} width="70%" />
      <Skeleton height={20} width="40%" />
      <div className="flex gap-4 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={24} width={100} variant="rectangular" />
        ))}
      </div>
    </div>

    {/* Main content */}
    <div className={`grid grid-cols-1 ${hasAside ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-8`}>
      {/* Left column */}
      <div className={hasAside ? 'lg:col-span-2 space-y-6' : 'space-y-6'}>
        <Skeleton height={400} className="w-full" />
        <div className="space-y-3">
          <Skeleton height={24} width="50%" />
          <Skeleton height={16} width="100%" />
          <Skeleton height={16} width="95%" />
          <Skeleton height={16} width="98%" />
        </div>
      </div>

      {/* Right sidebar */}
      {hasAside && (
        <div className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <Skeleton height={200} className="w-full" />
            <Skeleton height={48} className="w-full" />
            <Skeleton height={20} width="60%" />
            <Skeleton height={20} width="70%" />
          </div>
        </div>
      )}
    </div>

    {/* Sections */}
    <div className="space-y-4">
      <Skeleton height={32} width="30%" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 space-y-2">
          <Skeleton height={24} width="60%" />
          <Skeleton height={16} width="40%" />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Stats grid skeleton for displaying key metrics
 */
export const StatsSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border rounded-lg p-6 space-y-3">
        <Skeleton height={20} width="60%" />
        <Skeleton height={32} width="40%" />
        <Skeleton height={16} width="80%" />
      </div>
    ))}
  </div>
);

/**
 * Form skeleton for loading forms
 */
export const FormSkeleton: React.FC<{ fieldCount?: number }> = ({ fieldCount = 4 }) => (
  <form className="space-y-6" aria-busy="true" role="status">
    {Array.from({ length: fieldCount }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton height={20} width="25%" />
        <Skeleton height={40} className="w-full" />
      </div>
    ))}
    <Skeleton height={48} width="30%" />
  </form>
);

/**
 * Table skeleton for displaying tabular data
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="border rounded-lg overflow-hidden" role="status" aria-label="Loading table">
    {/* Header */}
    <div
      className="grid gap-4 p-4 border-b bg-gray-50"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} height={20} width="80%" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIdx) => (
      <div
        key={rowIdx}
        className="grid gap-4 p-4 border-b"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {Array.from({ length: columns }).map((_, colIdx) => (
          <Skeleton key={colIdx} height={16} width={`${60 + Math.random() * 40}%`} />
        ))}
      </div>
    ))}
  </div>
);
