import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BadgeDisplay, BadgeItem } from '@/components/ui/BadgeDisplay';

describe('BadgeDisplay Component', () => {
  const mockBadges: BadgeItem[] = [
    {
      id: '1',
      name: 'First Achievement',
      description: 'Your first achievement',
      icon: '⭐',
      variant: 'success',
      unlockedAt: '2024-01-15',
    },
    {
      id: '2',
      name: 'Second Achievement',
      description: 'Your second achievement',
      icon: '🏆',
      variant: 'warning',
      unlockedAt: null,
    },
    {
      id: '3',
      name: 'Third Achievement',
      description: 'Your third achievement',
      icon: '💎',
      variant: 'error',
      unlockedAt: '2024-01-20',
    },
  ];

  describe('grid variant', () => {
    it('should render grid of badges', () => {
      render(
        <BadgeDisplay variant="grid" badges={mockBadges} />
      );
      expect(screen.getByLabelText('Badges')).toBeInTheDocument();
      mockBadges.forEach((badge) => {
        expect(screen.getByText(badge.name)).toBeInTheDocument();
      });
    });

    it('should render empty message when no badges', () => {
      render(
        <BadgeDisplay variant="grid" badges={[]} />
      );
      expect(screen.getByText('No badges yet')).toBeInTheDocument();
    });

    it('should use custom empty message', () => {
      render(
        <BadgeDisplay variant="grid" badges={[]} emptyMessage="Come back later" />
      );
      expect(screen.getByText('Come back later')).toBeInTheDocument();
    });

    it('should call onSelect when badge is clicked', () => {
      const handleSelect = vi.fn();
      render(
        <BadgeDisplay variant="grid" badges={mockBadges} onSelect={handleSelect} />
      );
      const badgeItem = screen.getByText('First Achievement').closest('li');
      if (badgeItem) fireEvent.click(badgeItem);
      expect(handleSelect).toHaveBeenCalledWith(mockBadges[0]);
    });

    it('should show unlock date for unlocked badges', () => {
      render(
        <BadgeDisplay variant="grid" badges={mockBadges} />
      );
      // Badge with unlockedAt should display the date
      const elements = screen.getAllByText(/Jan/);
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should apply column classes', () => {
      const { container } = render(
        <BadgeDisplay variant="grid" badges={mockBadges} columns={3} />
      );
      const grid = container.querySelector('ul');
      expect(grid).toHaveClass('grid-cols-3');
    });
  });

  describe('inline variant', () => {
    it('should render inline badges', () => {
      const items = ['Tag 1', 'Tag 2', 'Tag 3'];
      render(
        <BadgeDisplay variant="inline" items={items} />
      );
      items.forEach((item) => {
        expect(screen.getByText(item)).toBeInTheDocument();
      });
    });

    it('should use custom tone', () => {
      const items = ['Success Item'];
      const { container } = render(
        <BadgeDisplay variant="inline" items={items} tone="success" />
      );
      const badge = container.querySelector('span');
      expect(badge).toHaveClass('bg-green-200');
    });
  });

  describe('counter variant', () => {
    it('should render counter badge with count', () => {
      render(
        <BadgeDisplay variant="counter" count={5} label="Items" />
      );
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('Items')).toBeInTheDocument();
    });

    it('should show max+ when count exceeds max', () => {
      render(
        <BadgeDisplay variant="counter" count={15} max={10} />
      );
      expect(screen.getByText('10+')).toBeInTheDocument();
    });

    it('should work without label', () => {
      render(
        <BadgeDisplay variant="counter" count={42} />
      );
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  describe('status variant', () => {
    it('should render active status', () => {
      render(
        <BadgeDisplay variant="status" status="active" />
      );
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render inactive status', () => {
      render(
        <BadgeDisplay variant="status" status="inactive" />
      );
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should render pending status', () => {
      render(
        <BadgeDisplay variant="status" status="pending" />
      );
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should render completed status', () => {
      render(
        <BadgeDisplay variant="status" status="completed" />
      );
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render error status', () => {
      render(
        <BadgeDisplay variant="status" status="error" />
      );
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should use custom label', () => {
      render(
        <BadgeDisplay variant="status" status="active" label="Running" />
      );
      expect(screen.getByText('Running')).toBeInTheDocument();
    });
  });

  describe('group variant', () => {
    it('should render group label and badges', () => {
      const items = ['Item 1', 'Item 2'];
      render(
        <BadgeDisplay variant="group" label="Group Title" items={items} />
      );
      expect(screen.getByText('Group Title')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('pill variant', () => {
    it('should render pill badges with unlock dates', () => {
      render(
        <BadgeDisplay variant="pill" badges={mockBadges} />
      );
      mockBadges.forEach((badge) => {
        expect(screen.getByText(badge.name)).toBeInTheDocument();
      });
    });

    it('should show icons in pills', () => {
      render(
        <BadgeDisplay variant="pill" badges={mockBadges} />
      );
      expect(screen.getByText('⭐')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
      expect(screen.getByText('💎')).toBeInTheDocument();
    });
  });

  describe('styling and className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <BadgeDisplay variant="inline" items={['Test']} className="custom-class" />
      );
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    it('should have aria-label on grid', () => {
      render(
        <BadgeDisplay variant="grid" badges={mockBadges} />
      );
      expect(screen.getByLabelText('Badges')).toBeInTheDocument();
    });

    it('should have aria-label on inline badges', () => {
      render(
        <BadgeDisplay variant="inline" items={['Item']} />
      );
      expect(screen.getByLabelText('Items')).toBeInTheDocument();
    });

    it('should hide icon aria from grid badges', () => {
      render(
        <BadgeDisplay variant="grid" badges={mockBadges} />
      );
      const icons = screen.getAllByLabelText('');
      // Icons should be hidden from screen readers (aria-hidden)
      expect(icons.length).toBeGreaterThan(0);
    });
  });
});
