/**
 * Unit tests for CourseProgressList component
 * 
 * Tests the course progress list with circular progress indicators,
 * loading states, and empty states.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseProgressList } from '@/components/dashboard/CourseProgressList';
import type { EnrolledCourse } from '@/lib/dashboard';

describe('CourseProgressList', () => {
  const mockCourses: EnrolledCourse[] = [
    {
      id: 'course-1',
      title: 'Blockchain Basics',
      progressPct: 45,
      enrolledAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'course-2',
      title: 'Smart Contracts 101',
      progressPct: 75,
      enrolledAt: '2024-01-05T00:00:00.000Z',
    },
    {
      id: 'course-3',
      title: 'DeFi Fundamentals',
      progressPct: 100,
      enrolledAt: '2024-01-10T00:00:00.000Z',
    },
  ];

  describe('Rendering', () => {
    it('should render list of courses with progress', () => {
      render(<CourseProgressList courses={mockCourses} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.getByText('Smart Contracts 101')).toBeInTheDocument();
      expect(screen.getByText('DeFi Fundamentals')).toBeInTheDocument();
    });

    it('should display progress percentage for incomplete courses', () => {
      render(<CourseProgressList courses={mockCourses} />);

      expect(screen.getByText('45% complete')).toBeInTheDocument();
      expect(screen.getByText('75% complete')).toBeInTheDocument();
    });

    it('should display completed badge for 100% courses', () => {
      render(<CourseProgressList courses={mockCourses} />);

      expect(screen.getByText('🏆 Completed')).toBeInTheDocument();
    });

    it('should render correct number of course cards', () => {
      const { container } = render(<CourseProgressList courses={mockCourses} />);

      const cards = container.querySelectorAll('.rounded-lg.border');
      expect(cards).toHaveLength(3);
    });
  });

  describe('Progress indicators', () => {
    it('should render circular progress for each course', () => {
      const { container } = render(<CourseProgressList courses={mockCourses} />);

      // CircularProgress components should be rendered
      const progressCircles = container.querySelectorAll('svg');
      expect(progressCircles.length).toBeGreaterThan(0);
    });

    it('should render progress bar for each course', () => {
      const { container } = render(<CourseProgressList courses={mockCourses} />);

      const progressBars = container.querySelectorAll('.h-2.w-full.rounded-full');
      expect(progressBars).toHaveLength(3);
    });

    it('should set correct width for progress bars', () => {
      const { container } = render(<CourseProgressList courses={mockCourses} />);

      const progressBars = container.querySelectorAll(
        '.h-full.rounded-full.bg-blue-500'
      );

      expect(progressBars[0]).toHaveStyle({ width: '45%' });
      expect(progressBars[1]).toHaveStyle({ width: '75%' });
      expect(progressBars[2]).toHaveStyle({ width: '100%' });
    });
  });

  describe('Empty state', () => {
    it('should display empty message when no courses', () => {
      render(<CourseProgressList courses={[]} />);

      expect(
        screen.getByText('You have not enrolled in any courses yet.')
      ).toBeInTheDocument();
    });

    it('should not render course cards when empty', () => {
      const { container } = render(<CourseProgressList courses={[]} />);

      const cards = container.querySelectorAll('.rounded-lg.border');
      expect(cards).toHaveLength(0);
    });
  });

  describe('Loading state', () => {
    it('should render skeleton blocks when loading', () => {
      const { container } = render(<CourseProgressList courses={[]} isLoading={true} />);

      const skeletons = container.querySelectorAll('.space-y-2');
      expect(skeletons).toHaveLength(3);
    });

    it('should not render courses when loading', () => {
      render(<CourseProgressList courses={mockCourses} isLoading={true} />);

      expect(screen.queryByText('Blockchain Basics')).not.toBeInTheDocument();
      expect(screen.queryByText('Smart Contracts 101')).not.toBeInTheDocument();
    });

    it('should not render empty message when loading', () => {
      render(<CourseProgressList courses={[]} isLoading={true} />);

      expect(
        screen.queryByText('You have not enrolled in any courses yet.')
      ).not.toBeInTheDocument();
    });

    it('should render courses when not loading', () => {
      render(<CourseProgressList courses={mockCourses} isLoading={false} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.getByText('Smart Contracts 101')).toBeInTheDocument();
    });
  });

  describe('Course progress states', () => {
    it('should handle 0% progress', () => {
      const courses: EnrolledCourse[] = [
        {
          id: 'course-1',
          title: 'Just Started',
          progressPct: 0,
          enrolledAt: '2024-01-20T00:00:00.000Z',
        },
      ];
      render(<CourseProgressList courses={courses} />);

      expect(screen.getByText('0% complete')).toBeInTheDocument();
    });

    it('should handle courses near completion', () => {
      const courses: EnrolledCourse[] = [
        {
          id: 'course-1',
          title: 'Almost Done',
          progressPct: 99,
          enrolledAt: '2024-01-20T00:00:00.000Z',
        },
      ];
      render(<CourseProgressList courses={courses} />);

      expect(screen.getByText('99% complete')).toBeInTheDocument();
    });

    it('should identify 100% as completed', () => {
      const courses: EnrolledCourse[] = [
        {
          id: 'course-1',
          title: 'Finished',
          progressPct: 100,
          enrolledAt: '2024-01-20T00:00:00.000Z',
        },
      ];
      render(<CourseProgressList courses={courses} />);

      expect(screen.getByText('🏆 Completed')).toBeInTheDocument();
      expect(screen.queryByText('100% complete')).not.toBeInTheDocument();
    });
  });

  describe('Course card styling', () => {
    it('should apply correct layout classes', () => {
      const { container } = render(<CourseProgressList courses={mockCourses} />);

      const card = container.querySelector('.rounded-lg.border');
      expect(card).toHaveClass('flex', 'items-center', 'gap-4');
    });

    it('should apply dark mode classes', () => {
      const { container } = render(<CourseProgressList courses={mockCourses} />);

      const card = container.querySelector('.rounded-lg.border');
      expect(card).toHaveClass('dark:border-gray-700', 'dark:bg-gray-900');
    });

    it('should apply progress bar transition classes', () => {
      const { container } = render(<CourseProgressList courses={mockCourses} />);

      const progressFill = container.querySelector('.bg-blue-500');
      expect(progressFill).toHaveClass('transition-all', 'duration-300');
    });
  });

  describe('Multiple courses', () => {
    it('should handle single course', () => {
      const courses: EnrolledCourse[] = [mockCourses[0]];
      render(<CourseProgressList courses={courses} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.queryByText('Smart Contracts 101')).not.toBeInTheDocument();
    });

    it('should handle many courses', () => {
      const manyCourses: EnrolledCourse[] = Array.from({ length: 10 }, (_, i) => ({
        id: `course-${i}`,
        title: `Course ${i + 1}`,
        progressPct: (i + 1) * 10,
        enrolledAt: '2024-01-01T00:00:00.000Z',
      }));

      render(<CourseProgressList courses={manyCourses} />);

      expect(screen.getByText('Course 1')).toBeInTheDocument();
      expect(screen.getByText('Course 10')).toBeInTheDocument();
    });

    it('should render courses in provided order', () => {
      const { container } = render(<CourseProgressList courses={mockCourses} />);

      const titles = Array.from(container.querySelectorAll('h3')).map((h3) => h3.textContent);

      expect(titles[0]).toBe('Blockchain Basics');
      expect(titles[1]).toBe('Smart Contracts 101');
      expect(titles[2]).toBe('DeFi Fundamentals');
    });
  });
});
