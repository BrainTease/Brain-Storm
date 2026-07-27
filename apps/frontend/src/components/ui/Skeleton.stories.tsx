import type { Meta, StoryObj } from '@storybook/react';
import {
  Skeleton,
  CourseCardSkeleton,
  CourseListSkeleton,
  CourseDetailSkeleton,
  DashboardSkeleton,
  ProfileSkeleton,
  VideoPlayerSkeleton,
} from './Skeleton';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Base skeleton primitive - rectangular variant
 */
export const Rectangular: Story = {
  args: {
    variant: 'rectangular',
    width: 300,
    height: 100,
  },
};

/**
 * Text skeleton for loading text content
 */
export const Text: Story = {
  args: {
    variant: 'text',
    width: '100%',
  },
};

/**
 * Circular skeleton for loading avatars
 */
export const Circular: Story = {
  args: {
    variant: 'circular',
    width: 80,
    height: 80,
  },
};

/**
 * Skeleton with shimmer wave animation (default)
 */
export const WithWaveAnimation: Story = {
  args: {
    animation: 'wave',
    width: 300,
    height: 100,
  },
};

/**
 * Skeleton with pulse animation
 */
export const WithPulseAnimation: Story = {
  args: {
    animation: 'pulse',
    width: 300,
    height: 100,
  },
};

/**
 * Skeleton with no animation (respects prefers-reduced-motion)
 */
export const NoAnimation: Story = {
  args: {
    animation: 'none',
    width: 300,
    height: 100,
  },
};

/**
 * Card skeleton for course cards in a grid
 */
export const CourseCard: StoryObj = {
  render: () => <CourseCardSkeleton />,
};

/**
 * Course list skeleton showing grid of loading cards
 */
export const CourseList: StoryObj = {
  render: () => <CourseListSkeleton count={6} />,
};

/**
 * Course detail page skeleton
 */
export const CourseDetail: StoryObj = {
  render: () => <CourseDetailSkeleton />,
};

/**
 * Dashboard skeleton with stats and course list
 */
export const Dashboard: StoryObj = {
  render: () => <DashboardSkeleton />,
};

/**
 * Profile page skeleton with avatar, stats, and sections
 */
export const Profile: StoryObj = {
  render: () => <ProfileSkeleton />,
};

/**
 * Video player skeleton with controls and sidebar
 */
export const VideoPlayer: StoryObj = {
  render: () => <VideoPlayerSkeleton />,
};

/**
 * Complex composition showing multiple skeletons together
 */
export const ComplexLayout: StoryObj = {
  render: () => (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="space-y-4">
        <Skeleton height={32} width="60%" variant="text" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <Skeleton height={20} width="70%" />
              <Skeleton height={24} width="40%" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton height={24} width="50%" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-3 flex gap-4">
            <Skeleton variant="circular" width={60} height={60} />
            <div className="flex-1 space-y-2">
              <Skeleton height={16} width="80%" />
              <Skeleton height={14} width="60%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};
