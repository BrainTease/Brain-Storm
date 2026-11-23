/**
 * Unit tests for TokenBalanceCard component
 * 
 * Tests the BST token balance card with loading states and balance formatting.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenBalanceCard } from '@/components/dashboard/TokenBalanceCard';

describe('TokenBalanceCard', () => {
  describe('Rendering', () => {
    it('should render section title', () => {
      render(<TokenBalanceCard balance={150} />);

      expect(screen.getByText('BST Token Balance')).toBeInTheDocument();
    });

    it('should render token balance with BST symbol', () => {
      render(<TokenBalanceCard balance={150} />);

      expect(screen.getByText(/150/)).toBeInTheDocument();
      expect(screen.getByText(/BST/)).toBeInTheDocument();
    });

    it('should use semantic HTML structure', () => {
      const { container } = render(<TokenBalanceCard balance={150} />);

      const section = container.querySelector('section');
      const heading = container.querySelector('h2');

      expect(section).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('BST Token Balance');
    });

    it('should apply card styling', () => {
      const { container } = render(<TokenBalanceCard balance={150} />);

      const card = container.querySelector('.rounded-lg.border');
      expect(card).toHaveClass('border-gray-200', 'dark:border-gray-700');
      expect(card).toHaveClass('bg-white', 'dark:bg-gray-900');
    });
  });

  describe('Balance display', () => {
    it('should display positive balance', () => {
      render(<TokenBalanceCard balance={500} />);

      expect(screen.getByText(/500/)).toBeInTheDocument();
    });

    it('should display zero balance', () => {
      render(<TokenBalanceCard balance={0} />);

      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('should display null balance as 0', () => {
      render(<TokenBalanceCard balance={null} />);

      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('should display large balances', () => {
      render(<TokenBalanceCard balance={1000000} />);

      expect(screen.getByText(/1000000/)).toBeInTheDocument();
    });

    it('should display decimal balances', () => {
      render(<TokenBalanceCard balance={123.45} />);

      expect(screen.getByText(/123\.45/)).toBeInTheDocument();
    });

    it('should display negative balance gracefully', () => {
      render(<TokenBalanceCard balance={-50} />);

      expect(screen.getByText(/-50/)).toBeInTheDocument();
    });
  });

  describe('Balance styling', () => {
    it('should apply large font size to balance', () => {
      const { container } = render(<TokenBalanceCard balance={150} />);

      const balanceText = container.querySelector('.text-3xl');
      expect(balanceText).toBeInTheDocument();
      expect(balanceText).toHaveClass('font-bold');
    });

    it('should apply green color to balance', () => {
      const { container } = render(<TokenBalanceCard balance={150} />);

      const balanceText = container.querySelector('.text-green-600');
      expect(balanceText).toBeInTheDocument();
      expect(balanceText).toHaveClass('dark:text-green-400');
    });
  });

  describe('Loading state', () => {
    it('should render skeleton when loading', () => {
      const { container } = render(<TokenBalanceCard balance={150} isLoading={true} />);

      const skeleton = container.querySelector('.h-7.w-32');
      expect(skeleton).toBeInTheDocument();
    });

    it('should not display balance when loading', () => {
      render(<TokenBalanceCard balance={150} isLoading={true} />);

      expect(screen.queryByText(/150/)).not.toBeInTheDocument();
      expect(screen.queryByText(/BST/)).not.toBeInTheDocument();
    });

    it('should still display title when loading', () => {
      render(<TokenBalanceCard balance={150} isLoading={true} />);

      expect(screen.getByText('BST Token Balance')).toBeInTheDocument();
    });

    it('should display balance when not loading', () => {
      render(<TokenBalanceCard balance={150} isLoading={false} />);

      expect(screen.getByText(/150/)).toBeInTheDocument();
      expect(screen.getByText(/BST/)).toBeInTheDocument();
    });

    it('should not render skeleton when not loading', () => {
      const { container } = render(<TokenBalanceCard balance={150} isLoading={false} />);

      const skeleton = container.querySelector('.h-7.w-32');
      expect(skeleton).not.toBeInTheDocument();
    });
  });

  describe('Title styling', () => {
    it('should apply correct heading classes', () => {
      const { container } = render(<TokenBalanceCard balance={150} />);

      const heading = container.querySelector('h2');
      expect(heading).toHaveClass('text-2xl', 'font-semibold');
      expect(heading).toHaveClass('text-gray-900', 'dark:text-gray-100');
    });
  });

  describe('Dark mode support', () => {
    it('should have dark mode classes for title', () => {
      const { container } = render(<TokenBalanceCard balance={150} />);

      const heading = container.querySelector('h2');
      expect(heading).toHaveClass('dark:text-gray-100');
    });

    it('should have dark mode classes for card', () => {
      const { container } = render(<TokenBalanceCard balance={150} />);

      const card = container.querySelector('.rounded-lg.border');
      expect(card).toHaveClass('dark:border-gray-700', 'dark:bg-gray-900');
    });

    it('should have dark mode classes for balance text', () => {
      const { container } = render(<TokenBalanceCard balance={150} />);

      const balanceText = container.querySelector('.text-green-600');
      expect(balanceText).toHaveClass('dark:text-green-400');
    });
  });

  describe('Edge cases', () => {
    it('should handle very small decimal values', () => {
      render(<TokenBalanceCard balance={0.0001} />);

      expect(screen.getByText(/0\.0001/)).toBeInTheDocument();
    });

    it('should handle very large values', () => {
      render(<TokenBalanceCard balance={999999999} />);

      expect(screen.getByText(/999999999/)).toBeInTheDocument();
    });

    it('should render with null balance and not loading', () => {
      const { container } = render(<TokenBalanceCard balance={null} isLoading={false} />);

      expect(screen.getByText(/0/)).toBeInTheDocument();
      const skeleton = container.querySelector('.h-7.w-32');
      expect(skeleton).not.toBeInTheDocument();
    });

    it('should render with zero balance and not loading', () => {
      const { container } = render(<TokenBalanceCard balance={0} isLoading={false} />);

      expect(screen.getByText(/0/)).toBeInTheDocument();
      const skeleton = container.querySelector('.h-7.w-32');
      expect(skeleton).not.toBeInTheDocument();
    });
  });
});
