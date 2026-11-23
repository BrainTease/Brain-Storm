/**
 * Unit tests for QuickStats component
 * 
 * Tests the quick stats summary row with completed, in-progress,
 * hours studied, and token balance stats.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickStats } from '@/components/dashboard/QuickStats';
import type { DashboardStats } from '@/lib/dashboard';

describe('QuickStats', () => {
  const mockStats: DashboardStats = {
    completed: 5,
    inProgress: 3,
    totalHours: 42,
    totalCourses: 8,
  };

  describe('Rendering', () => {
    it('should render all four stat cards with correct values', () => {
      render(<QuickStats stats={mockStats} tokenBalance={150} />);

      expect(screen.getByText('Courses Completed')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();

      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();

      expect(screen.getByText('Total Hours')).toBeInTheDocument();
      expect(screen.getByText('42h')).toBeInTheDocument();

      expect(screen.getByText('BST Tokens')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should render with aria-label for accessibility', () => {
      render(<QuickStats stats={mockStats} tokenBalance={150} />);

      const section = screen.getByLabelText('Quick stats');
      expect(section).toBeInTheDocument();
    });

    it('should display icons for each stat', () => {
      render(<QuickStats stats={mockStats} tokenBalance={150} />);

      expect(screen.getByText('🏆')).toBeInTheDocument();
      expect(screen.getByText('📚')).toBeInTheDocument();
      expect(screen.getByText('⏱')).toBeInTheDocument();
      expect(screen.getByText('🪙')).toBeInTheDocument();
    });

    it('should use responsive grid layout', () => {
      const { container } = render(<QuickStats stats={mockStats} tokenBalance={150} />);

      const grid = container.querySelector('.grid');
      expect(grid).toHaveClass('grid-cols-2', 'sm:grid-cols-4');
    });
  });

  describe('Token balance', () => {
    it('should display token balance when provided', () => {
      render(<QuickStats stats={mockStats} tokenBalance={250} />);

      expect(screen.getByText('250')).toBeInTheDocument();
    });

    it('should display 0 when token balance is null', () => {
      render(<QuickStats stats={mockStats} tokenBalance={null} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should display 0 when token balance is 0', () => {
      render(<QuickStats stats={mockStats} tokenBalance={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle large token balances', () => {
      render(<QuickStats stats={mockStats} tokenBalance={1000000} />);

      expect(screen.getByText('1000000')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should render skeleton blocks when loading', () => {
      const { container } = render(
        <QuickStats stats={mockStats} tokenBalance={150} isLoading={true} />
      );

      const skeletons = container.querySelectorAll('.h-20');
      expect(skeletons).toHaveLength(4);
    });

    it('should not render stat cards when loading', () => {
      render(<QuickStats stats={mockStats} tokenBalance={150} isLoading={true} />);

      expect(screen.queryByText('Courses Completed')).not.toBeInTheDocument();
      expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
      expect(screen.queryByText('Total Hours')).not.toBeInTheDocument();
      expect(screen.queryByText('BST Tokens')).not.toBeInTheDocument();
    });

    it('should render stats when not loading', () => {
      render(<QuickStats stats={mockStats} tokenBalance={150} isLoading={false} />);

      expect(screen.getByText('Courses Completed')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Total Hours')).toBeInTheDocument();
      expect(screen.getByText('BST Tokens')).toBeInTheDocument();
    });
  });

  describe('Stats variations', () => {
    it('should handle zero completed courses', () => {
      const stats: DashboardStats = {
        ...mockStats,
        completed: 0,
      };
      render(<QuickStats stats={stats} tokenBalance={0} />);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle zero in-progress courses', () => {
      const stats: DashboardStats = {
        ...mockStats,
        inProgress: 0,
      };
      render(<QuickStats stats={stats} tokenBalance={0} />);

      const values = screen.getAllByText('0');
      expect(values.length).toBeGreaterThan(0);
    });

    it('should handle large hour values', () => {
      const stats: DashboardStats = {
        ...mockStats,
        totalHours: 999,
      };
      render(<QuickStats stats={stats} tokenBalance={0} />);

      expect(screen.getByText('999h')).toBeInTheDocument();
    });

    it('should format hours with h suffix', () => {
      render(<QuickStats stats={mockStats} tokenBalance={150} />);

      expect(screen.getByText('42h')).toBeInTheDocument();
      expect(screen.queryByText('42')).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle all stats being zero', () => {
      const stats: DashboardStats = {
        completed: 0,
        inProgress: 0,
        totalHours: 0,
        totalCourses: 0,
      };
      render(<QuickStats stats={stats} tokenBalance={0} />);

      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2); // At least for balance and one stat
    });

    it('should handle negative token balance gracefully', () => {
      render(<QuickStats stats={mockStats} tokenBalance={-10} />);

      expect(screen.getByText('-10')).toBeInTheDocument();
    });
  });
});
