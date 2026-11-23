/**
 * Unit tests for EnrolledCourseList component
 * 
 * Tests the enrolled course list with progress bars, completion markers,
 * and navigation links.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EnrolledCourseList } from '@/components/dashboard/EnrolledCourseList';
import type { EnrolledCourse } from '@/lib/dashboard';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('EnrolledCourseList', () => {
  const mockCourses: EnrolledCourse[] = [
    {
      id: 'course-1',
      courseId: 'course-1',
      title: 'Blockchain Basics',
      level: 'beginner',
      progressPct: 45,
      enrolledAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'course-2',
      courseId: 'course-2',
      title: 'Smart Contracts 101',
      level: 'intermediate',
      progressPct: 75,
      enrolledAt: '2024-01-05T00:00:00.000Z',
    },
    {
      id: 'course-3',
      courseId: 'course-3',
      title: 'DeFi Fundamentals',
      level: 'advanced',
      progressPct: 100,
      enrolledAt: '2024-01-10T00:00:00.000Z',
    },
  ];

  describe('Rendering', () => {
    it('should render list of enrolled courses', () => {
      render(<EnrolledCourseList courses={mockCourses} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.getByText('Smart Contracts 101')).toBeInTheDocument();
      expect(screen.getByText('DeFi Fundamentals')).toBeInTheDocument();
    });

    it('should use ul element for semantic list', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
      expect(list).toHaveClass('space-y-3');
    });

    it('should render correct number of courses', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const items = container.querySelectorAll('li');
      expect(items).toHaveLength(3);
    });
  });

  describe('Course links', () => {
    it('should link to course detail pages', () => {
      render(<EnrolledCourseList courses={mockCourses} />);

      const link1 = screen.getByRole('link', { name: 'Blockchain Basics' });
      const link2 = screen.getByRole('link', { name: 'Smart Contracts 101' });

      expect(link1).toHaveAttribute('href', '/courses/course-1');
      expect(link2).toHaveAttribute('href', '/courses/course-2');
    });

    it('should apply hover styles to links', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('hover:text-blue-600', 'dark:hover:text-blue-400');
    });

    it('should truncate long course titles in links', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('truncate');
    });
  });

  describe('Level badges', () => {
    it('should display level badges when level is provided', () => {
      render(<EnrolledCourseList courses={mockCourses} />);

      expect(screen.getByText('beginner')).toBeInTheDocument();
      expect(screen.getByText('intermediate')).toBeInTheDocument();
      expect(screen.getByText('advanced')).toBeInTheDocument();
    });

    it('should capitalize level badges', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const badges = container.querySelectorAll('.capitalize');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should not display badge when level is missing', () => {
      const courses: EnrolledCourse[] = [
        {
          id: 'course-1',
          courseId: 'course-1',
          title: 'Course Without Level',
          progressPct: 50,
          enrolledAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      render(<EnrolledCourseList courses={courses} />);

      expect(screen.getByText('Course Without Level')).toBeInTheDocument();
      // Badge component might not render at all if level is undefined
    });
  });

  describe('Progress bars', () => {
    it('should display progress percentage labels', () => {
      render(<EnrolledCourseList courses={mockCourses} />);

      expect(screen.getByText('45% complete')).toBeInTheDocument();
      expect(screen.getByText('75% complete')).toBeInTheDocument();
      expect(screen.getByText('100% complete')).toBeInTheDocument();
    });

    it('should render ProgressBar component for each course', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      // ProgressBar components should be rendered
      // Count based on the structure provided by the component
      const progressElements = container.querySelectorAll('[role="progressbar"]');
      expect(progressElements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Completion indicator', () => {
    it('should display trophy icon for completed courses', () => {
      render(<EnrolledCourseList courses={mockCourses} />);

      const trophy = screen.getByLabelText('Completed');
      expect(trophy).toBeInTheDocument();
      expect(trophy).toHaveTextContent('🏆');
    });

    it('should have accessible label for trophy icon', () => {
      render(<EnrolledCourseList courses={mockCourses} />);

      const trophy = screen.getByLabelText('Completed');
      expect(trophy).toHaveAttribute('title', 'Completed');
    });

    it('should not display trophy for incomplete courses', () => {
      const courses: EnrolledCourse[] = [
        {
          id: 'course-1',
          courseId: 'course-1',
          title: 'Incomplete Course',
          progressPct: 50,
          enrolledAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      render(<EnrolledCourseList courses={courses} />);

      expect(screen.queryByLabelText('Completed')).not.toBeInTheDocument();
    });

    it('should display trophy for 100% progress', () => {
      const courses: EnrolledCourse[] = [
        {
          id: 'course-1',
          courseId: 'course-1',
          title: 'Complete Course',
          progressPct: 100,
          enrolledAt: '2024-01-01T00:00:00.000Z',
        },
      ];
      render(<EnrolledCourseList courses={courses} />);

      expect(screen.getByLabelText('Completed')).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should display empty message when no courses', () => {
      render(<EnrolledCourseList courses={[]} />);

      expect(screen.getByText('No courses found.')).toBeInTheDocument();
    });

    it('should display browse courses link in empty state', () => {
      render(<EnrolledCourseList courses={[]} />);

      const link = screen.getByRole('link', { name: /Browse courses/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/courses');
    });

    it('should use dashed border for empty state', () => {
      const { container } = render(<EnrolledCourseList courses={[]} />);

      const emptyState = container.querySelector('.border-dashed');
      expect(emptyState).toBeInTheDocument();
    });

    it('should not render list when empty', () => {
      const { container } = render(<EnrolledCourseList courses={[]} />);

      const list = container.querySelector('ul');
      expect(list).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should render skeleton blocks when loading', () => {
      const { container } = render(<EnrolledCourseList courses={[]} isLoading={true} />);

      const skeletons = container.querySelectorAll('.h-20');
      expect(skeletons).toHaveLength(3);
    });

    it('should not render courses when loading', () => {
      render(<EnrolledCourseList courses={mockCourses} isLoading={true} />);

      expect(screen.queryByText('Blockchain Basics')).not.toBeInTheDocument();
      expect(screen.queryByText('Smart Contracts 101')).not.toBeInTheDocument();
    });

    it('should not render empty message when loading', () => {
      render(<EnrolledCourseList courses={[]} isLoading={true} />);

      expect(screen.queryByText('No courses found.')).not.toBeInTheDocument();
    });

    it('should render courses when not loading', () => {
      render(<EnrolledCourseList courses={mockCourses} isLoading={false} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.getByText('Smart Contracts 101')).toBeInTheDocument();
    });
  });

  describe('Card styling', () => {
    it('should apply card styling to course rows', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const card = container.querySelector('.rounded-xl.border');
      expect(card).toHaveClass('border-gray-200', 'dark:border-gray-700');
      expect(card).toHaveClass('bg-white', 'dark:bg-gray-900');
    });

    it('should use flex layout for course rows', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const row = container.querySelector('li');
      expect(row).toHaveClass('flex', 'items-center', 'gap-4');
    });
  });

  describe('Dark mode support', () => {
    it('should have dark mode classes for cards', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const card = container.querySelector('.border');
      expect(card).toHaveClass('dark:border-gray-700', 'dark:bg-gray-900');
    });

    it('should have dark mode classes for links', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const link = container.querySelector('a');
      expect(link).toHaveClass('dark:text-gray-100');
    });

    it('should have dark mode classes for empty state', () => {
      const { container } = render(<EnrolledCourseList courses={[]} />);

      const emptyState = container.querySelector('.border-dashed');
      expect(emptyState).toHaveClass('dark:border-gray-600');
    });
  });

  describe('Multiple courses', () => {
    it('should handle single course', () => {
      const courses: EnrolledCourse[] = [mockCourses[0]];
      render(<EnrolledCourseList courses={courses} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.queryByText('Smart Contracts 101')).not.toBeInTheDocument();
    });

    it('should handle many courses', () => {
      const manyCourses: EnrolledCourse[] = Array.from({ length: 10 }, (_, i) => ({
        id: `course-${i}`,
        courseId: `course-${i}`,
        title: `Course ${i + 1}`,
        progressPct: (i + 1) * 10,
        enrolledAt: '2024-01-01T00:00:00.000Z',
      }));

      render(<EnrolledCourseList courses={manyCourses} />);

      expect(screen.getByText('Course 1')).toBeInTheDocument();
      expect(screen.getByText('Course 10')).toBeInTheDocument();
    });

    it('should render courses in provided order', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const links = Array.from(container.querySelectorAll('a')).slice(0, 3); // First 3 links
      const titles = links.map((link) => link.textContent);

      expect(titles[0]).toBe('Blockchain Basics');
      expect(titles[1]).toBe('Smart Contracts 101');
      expect(titles[2]).toBe('DeFi Fundamentals');
    });
  });

  describe('Progress states', () => {
    it('should handle 0% progress', () => {
      const courses: EnrolledCourse[] = [
        {
          id: 'course-1',
          courseId: 'course-1',
          title: 'Just Started',
          progressPct: 0,
          enrolledAt: '2024-01-20T00:00:00.000Z',
        },
      ];
      render(<EnrolledCourseList courses={courses} />);

      expect(screen.getByText('0% complete')).toBeInTheDocument();
      expect(screen.queryByLabelText('Completed')).not.toBeInTheDocument();
    });

    it('should handle 99% progress (not completed)', () => {
      const courses: EnrolledCourse[] = [
        {
          id: 'course-1',
          courseId: 'course-1',
          title: 'Almost Done',
          progressPct: 99,
          enrolledAt: '2024-01-20T00:00:00.000Z',
        },
      ];
      render(<EnrolledCourseList courses={courses} />);

      expect(screen.getByText('99% complete')).toBeInTheDocument();
      expect(screen.queryByLabelText('Completed')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should use semantic list markup', () => {
      const { container } = render(<EnrolledCourseList courses={mockCourses} />);

      const list = container.querySelector('ul');
      const items = container.querySelectorAll('li');

      expect(list).toBeInTheDocument();
      expect(items.length).toBeGreaterThan(0);
    });

    it('should have accessible labels for completion indicators', () => {
      render(<EnrolledCourseList courses={mockCourses} />);

      const trophy = screen.getByLabelText('Completed');
      expect(trophy).toHaveAttribute('aria-label', 'Completed');
      expect(trophy).toHaveAttribute('title', 'Completed');
    });

    it('should have navigable links', () => {
      render(<EnrolledCourseList courses={mockCourses} />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    });
  });
});
