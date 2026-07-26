import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReputationScoreWidget } from '@/components/gamification/ReputationScoreWidget';

describe('ReputationScoreWidget', () => {
  const defaultProps = {
    level: 5,
    xp: 250,
    xpForNextLevel: 1000,
    streak: 7,
    longestStreak: 15,
  };

  describe('full view', () => {
    it('should render level and XP progress', () => {
      render(<ReputationScoreWidget {...defaultProps} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('250 / 1000 XP')).toBeInTheDocument();
    });

    it('should render current streak', () => {
      render(<ReputationScoreWidget {...defaultProps} />);

      expect(screen.getByText('Current Streak')).toBeInTheDocument();
      expect(screen.getAllByText('7')[0]).toBeInTheDocument();
    });

    it('should render longest streak', () => {
      render(<ReputationScoreWidget {...defaultProps} />);

      expect(screen.getByText('Longest Streak')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(<ReputationScoreWidget {...defaultProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '250');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '1000');
    });

    it('should calculate XP percentage correctly', () => {
      render(<ReputationScoreWidget {...defaultProps} />);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '25%' });
    });

    it('should cap progress bar at 100%', () => {
      render(
        <ReputationScoreWidget
          {...defaultProps}
          xp={1200}
          xpForNextLevel={1000}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveStyle({ width: '100%' });
    });

    it('should accept custom className', () => {
      const { container } = render(
        <ReputationScoreWidget {...defaultProps} className="custom-class" />
      );

      const root = container.firstChild;
      expect(root).toHaveClass('custom-class');
    });
  });

  describe('compact view', () => {
    it('should render compact layout when compact prop is true', () => {
      render(<ReputationScoreWidget {...defaultProps} compact={true} />);

      expect(screen.getByText('Level')).toBeInTheDocument();
      expect(screen.getByText('Streak')).toBeInTheDocument();
    });

    it('should show level and streak inline', () => {
      const { container } = render(
        <ReputationScoreWidget {...defaultProps} compact={true} />
      );

      const root = container.firstChild;
      expect(root).toHaveClass('inline-flex');
    });

    it('should not show full XP progress in compact mode', () => {
      render(<ReputationScoreWidget {...defaultProps} compact={true} />);

      expect(screen.queryByText('250 / 1000 XP')).not.toBeInTheDocument();
      expect(screen.queryByText('Current Streak')).not.toBeInTheDocument();
    });

    it('should show level number in compact mode', () => {
      const { container } = render(
        <ReputationScoreWidget {...defaultProps} compact={true} />
      );

      const levelElement = screen.getByText('5');
      expect(levelElement).toBeInTheDocument();
    });

    it('should show streak in compact mode', () => {
      render(<ReputationScoreWidget {...defaultProps} compact={true} />);

      expect(screen.getByText('7')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle zero values', () => {
      render(
        <ReputationScoreWidget
          {...defaultProps}
          level={0}
          xp={0}
          streak={0}
          longestStreak={0}
        />
      );

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      render(
        <ReputationScoreWidget
          {...defaultProps}
          level={100}
          xp={999999}
          xpForNextLevel={1000000}
          longestStreak={365}
        />
      );

      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('999999 / 1000000 XP')).toBeInTheDocument();
      expect(screen.getByText('365')).toBeInTheDocument();
    });
  });
});
