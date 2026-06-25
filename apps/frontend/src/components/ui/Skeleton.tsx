import React, { useEffect, useState } from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Skeleton primitive for showing loading placeholders
 * Respects prefers-reduced-motion for accessibility
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'wave',
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check prefers-reduced-motion on mount
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const baseClasses = 'bg-gray-200 dark:bg-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  // Respect prefers-reduced-motion
  const effectiveAnimation = prefersReducedMotion ? 'none' : animation;

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]',
    none: '',
  };

  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || (variant === 'text' ? '1em' : '100%'),
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[effectiveAnimation]} ${className}`}
      style={style}
      aria-busy="true"
      aria-live="polite"
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const CourseCardSkeleton: React.FC = () => {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm" aria-busy="true">
      <Skeleton height={200} className="w-full" />
      <div className="p-4 space-y-3">
        <Skeleton height={24} width="80%" />
        <Skeleton height={16} width="60%" />
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="90%" />
        <div className="flex justify-between items-center mt-4">
          <Skeleton height={20} width={80} variant="rectangular" />
          <Skeleton height={32} width={100} variant="rectangular" />
        </div>
      </div>
    </div>
  );
};

export const CourseListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status" aria-label="Loading courses">
      {Array.from({ length: count }).map((_, index) => (
        <CourseCardSkeleton key={index} />
      ))}
    </div>
  );
};

export const CourseDetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" aria-busy="true" role="status">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton height={40} width="70%" />
        <Skeleton height={20} width="40%" />
        <div className="flex gap-4 mt-4">
          <Skeleton height={24} width={100} variant="rectangular" />
          <Skeleton height={24} width={100} variant="rectangular" />
          <Skeleton height={24} width={100} variant="rectangular" />
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Skeleton height={400} className="w-full" />
          <div className="space-y-3">
            <Skeleton height={24} width="50%" />
            <Skeleton height={16} width="100%" />
            <Skeleton height={16} width="95%" />
            <Skeleton height={16} width="98%" />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <Skeleton height={200} className="w-full" />
            <Skeleton height={48} className="w-full" />
            <Skeleton height={20} width="60%" />
            <Skeleton height={20} width="70%" />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <Skeleton height={32} width="30%" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-2">
            <Skeleton height={24} width="60%" />
            <Skeleton height={16} width="40%" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" aria-busy="true" role="status">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton height={36} width="40%" />
        <Skeleton height={20} width="60%" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-6 space-y-3">
            <Skeleton height={20} width="60%" />
            <Skeleton height={32} width="40%" />
            <Skeleton height={16} width="80%" />
          </div>
        ))}
      </div>

      {/* Progress section */}
      <div className="space-y-4">
        <Skeleton height={28} width="30%" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex gap-4">
                <Skeleton height={80} width={80} variant="rectangular" />
                <div className="flex-1 space-y-2">
                  <Skeleton height={20} width="80%" />
                  <Skeleton height={16} width="60%" />
                  <Skeleton height={8} className="w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton for profile page with user info, stats, and settings sections
 */
export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" aria-busy="true" role="status">
      {/* Profile header with avatar and basic info */}
      <div className="border rounded-lg p-8 space-y-6">
        <div className="flex items-center gap-6">
          <Skeleton variant="circular" width={120} height={120} />
          <div className="flex-1 space-y-3">
            <Skeleton height={28} width="40%" />
            <Skeleton height={20} width="50%" />
            <Skeleton height={16} width="35%" />
          </div>
        </div>
      </div>

      {/* User stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-2">
            <Skeleton height={16} width="60%" />
            <Skeleton height={24} width="40%" />
          </div>
        ))}
      </div>

      {/* Sections: About, Settings, etc. */}
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="border rounded-lg p-6 space-y-4">
          <Skeleton height={24} width="30%" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b">
                <Skeleton height={20} width="40%" />
                <Skeleton height={20} width="20%" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton for video player and course content
 */
export const VideoPlayerSkeleton: React.FC = () => {
  return (
    <div className="space-y-6" aria-busy="true" role="status">
      {/* Video player placeholder */}
      <Skeleton height={400} className="w-full rounded-lg" />

      {/* Video controls/timeline skeleton */}
      <div className="space-y-2">
        <Skeleton height={2} className="w-full" />
        <div className="flex justify-between">
          <Skeleton height={16} width="15%" />
          <Skeleton height={16} width="15%" />
        </div>
      </div>

      {/* Course info section */}
      <div className="space-y-4">
        <Skeleton height={24} width="50%" />
        <Skeleton height={16} width="100%" />
        <Skeleton height={16} width="95%" />
        <Skeleton height={16} width="90%" />
      </div>

      {/* Course sidebar - modules/sections */}
      <div className="mt-8 space-y-3">
        <Skeleton height={20} width="40%" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-2">
            <Skeleton height={18} width="70%" />
            <Skeleton height={14} width="50%" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for course detail page
 */
export const CourseDetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" aria-busy="true" role="status">
      {/* Header */}
      <div className="space-y-4">
        <Skeleton height={40} width="70%" />
        <Skeleton height={20} width="40%" />
        <div className="flex gap-4 mt-4">
          <Skeleton height={24} width={100} variant="rectangular" />
          <Skeleton height={24} width={100} variant="rectangular" />
          <Skeleton height={24} width={100} variant="rectangular" />
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          <Skeleton height={400} className="w-full" />
          <div className="space-y-3">
            <Skeleton height={24} width="50%" />
            <Skeleton height={16} width="100%" />
            <Skeleton height={16} width="95%" />
            <Skeleton height={16} width="98%" />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="border rounded-lg p-6 space-y-4">
            <Skeleton height={200} className="w-full" />
            <Skeleton height={48} className="w-full" />
            <Skeleton height={20} width="60%" />
            <Skeleton height={20} width="70%" />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <Skeleton height={32} width="30%" />
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-2">
            <Skeleton height={24} width="60%" />
            <Skeleton height={16} width="40%" />
          </div>
        ))}
      </div>
    </div>
  );
};
