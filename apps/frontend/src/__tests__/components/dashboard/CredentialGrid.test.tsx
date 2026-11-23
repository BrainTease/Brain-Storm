/**
 * Unit tests for CredentialGrid component
 * 
 * Tests the credential grid displaying earned badges and certificates
 * with loading and empty states.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CredentialGrid } from '@/components/dashboard/CredentialGrid';
import type { CredentialRecord } from '@/lib/dashboard';

describe('CredentialGrid', () => {
  const mockCredentials: CredentialRecord[] = [
    {
      id: 'cred-1',
      courseId: 'course-1',
      course: { title: 'Blockchain Basics' },
      issuedAt: '2024-01-15T00:00:00.000Z',
      status: 'issued',
    },
    {
      id: 'cred-2',
      courseId: 'course-2',
      course: { title: 'Smart Contracts 101' },
      issuedAt: '2024-01-20T00:00:00.000Z',
      status: 'issued',
    },
    {
      id: 'cred-3',
      courseId: 'course-3',
      course: { title: 'DeFi Fundamentals' },
      issuedAt: '2024-01-25T00:00:00.000Z',
      status: 'issued',
    },
  ];

  describe('Rendering', () => {
    it('should render list of credentials', () => {
      render(<CredentialGrid credentials={mockCredentials} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.getByText('Smart Contracts 101')).toBeInTheDocument();
      expect(screen.getByText('DeFi Fundamentals')).toBeInTheDocument();
    });

    it('should use ul element for semantic list', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const list = container.querySelector('ul');
      expect(list).toBeInTheDocument();
    });

    it('should render correct number of credentials', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const items = container.querySelectorAll('li');
      expect(items).toHaveLength(3);
    });

    it('should display graduation cap icon for each credential', () => {
      render(<CredentialGrid credentials={mockCredentials} />);

      const icons = screen.getAllByText('🎓');
      expect(icons).toHaveLength(3);
    });

    it('should mark icons as aria-hidden', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Grid layout', () => {
    it('should use responsive grid layout', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3');
    });

    it('should have gap between items', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('gap-3');
    });
  });

  describe('Credential cards', () => {
    it('should apply card styling', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const card = container.querySelector('.rounded-xl.border');
      expect(card).toHaveClass('border-gray-200', 'dark:border-gray-700');
      expect(card).toHaveClass('bg-white', 'dark:bg-gray-900');
    });

    it('should display course title', () => {
      render(<CredentialGrid credentials={mockCredentials} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
    });

    it('should display issued date', () => {
      render(<CredentialGrid credentials={mockCredentials} />);

      // Dates should be formatted using formatDateShort
      const dates = screen.getAllByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should truncate long course titles', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const title = container.querySelector('.truncate');
      expect(title).toBeInTheDocument();
    });
  });

  describe('Empty state', () => {
    it('should display empty message when no credentials', () => {
      render(<CredentialGrid credentials={[]} />);

      expect(
        screen.getByText('Complete a course to earn your first certificate.')
      ).toBeInTheDocument();
    });

    it('should not render list when empty', () => {
      const { container } = render(<CredentialGrid credentials={[]} />);

      const list = container.querySelector('ul');
      expect(list).not.toBeInTheDocument();
    });

    it('should not render grid when empty', () => {
      const { container } = render(<CredentialGrid credentials={[]} />);

      const grid = container.querySelector('.grid');
      expect(grid).not.toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should render skeleton blocks when loading', () => {
      const { container } = render(<CredentialGrid credentials={[]} isLoading={true} />);

      const skeletons = container.querySelectorAll('.h-16');
      expect(skeletons).toHaveLength(3);
    });

    it('should use grid layout for skeletons', () => {
      const { container } = render(<CredentialGrid credentials={[]} isLoading={true} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-2', 'sm:grid-cols-3');
    });

    it('should not render credentials when loading', () => {
      render(<CredentialGrid credentials={mockCredentials} isLoading={true} />);

      expect(screen.queryByText('Blockchain Basics')).not.toBeInTheDocument();
      expect(screen.queryByText('Smart Contracts 101')).not.toBeInTheDocument();
    });

    it('should not render empty message when loading', () => {
      render(<CredentialGrid credentials={[]} isLoading={true} />);

      expect(
        screen.queryByText('Complete a course to earn your first certificate.')
      ).not.toBeInTheDocument();
    });

    it('should render credentials when not loading', () => {
      render(<CredentialGrid credentials={mockCredentials} isLoading={false} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.getByText('Smart Contracts 101')).toBeInTheDocument();
    });
  });

  describe('Course title handling', () => {
    it('should display course title from course object', () => {
      render(<CredentialGrid credentials={mockCredentials} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
    });

    it('should fallback to courseId when course title is missing', () => {
      const credentials: CredentialRecord[] = [
        {
          id: 'cred-1',
          courseId: 'course-123',
          issuedAt: '2024-01-15T00:00:00.000Z',
          status: 'issued',
        },
      ];
      render(<CredentialGrid credentials={credentials} />);

      expect(screen.getByText('Course course-123')).toBeInTheDocument();
    });

    it('should fallback to courseId when course object is missing', () => {
      const credentials: CredentialRecord[] = [
        {
          id: 'cred-1',
          courseId: 'course-456',
          course: undefined,
          issuedAt: '2024-01-15T00:00:00.000Z',
          status: 'issued',
        },
      ];
      render(<CredentialGrid credentials={credentials} />);

      expect(screen.getByText('Course course-456')).toBeInTheDocument();
    });
  });

  describe('Dark mode support', () => {
    it('should have dark mode classes for cards', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const card = container.querySelector('.border');
      expect(card).toHaveClass('dark:border-gray-700', 'dark:bg-gray-900');
    });

    it('should have dark mode classes for text', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const title = container.querySelector('.font-medium');
      expect(title).toHaveClass('dark:text-gray-100');
    });

    it('should have dark mode classes for empty state', () => {
      const { container } = render(<CredentialGrid credentials={[]} />);

      const emptyText = container.querySelector('.text-gray-500');
      expect(emptyText).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Multiple credentials', () => {
    it('should handle single credential', () => {
      const credentials: CredentialRecord[] = [mockCredentials[0]];
      render(<CredentialGrid credentials={credentials} />);

      expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
      expect(screen.queryByText('Smart Contracts 101')).not.toBeInTheDocument();
    });

    it('should handle many credentials', () => {
      const manyCredentials: CredentialRecord[] = Array.from({ length: 10 }, (_, i) => ({
        id: `cred-${i}`,
        courseId: `course-${i}`,
        course: { title: `Course ${i + 1}` },
        issuedAt: '2024-01-15T00:00:00.000Z',
        status: 'issued' as const,
      }));

      render(<CredentialGrid credentials={manyCredentials} />);

      expect(screen.getByText('Course 1')).toBeInTheDocument();
      expect(screen.getByText('Course 10')).toBeInTheDocument();
    });

    it('should render credentials in provided order', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const titles = Array.from(container.querySelectorAll('.font-medium')).map(
        (el) => el.textContent
      );

      expect(titles[0]).toBe('Blockchain Basics');
      expect(titles[1]).toBe('Smart Contracts 101');
      expect(titles[2]).toBe('DeFi Fundamentals');
    });
  });

  describe('Accessibility', () => {
    it('should use semantic list markup', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const list = container.querySelector('ul');
      const items = container.querySelectorAll('li');

      expect(list).toBeInTheDocument();
      expect(items.length).toBeGreaterThan(0);
    });

    it('should hide decorative icons from screen readers', () => {
      const { container } = render(<CredentialGrid credentials={mockCredentials} />);

      const icons = container.querySelectorAll('[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
