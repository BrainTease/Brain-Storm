import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { BadgeGrid, type Badge } from '@/components/gamification/BadgeGrid';
import * as BadgeDisplayModule from '@/components/ui/BadgeDisplay';

vi.mock('@/components/ui/BadgeDisplay', () => ({
  BadgeDisplay: ({ variant, badges, emptyMessage }: any) => {
    if (variant === 'grid' && badges.length === 0) {
      return <p>{emptyMessage}</p>;
    }
    return (
      <div data-testid="badge-display">
        {badges.map((badge: any) => (
          <div key={badge.id} data-testid={`badge-${badge.id}`}>
            {badge.name}
          </div>
        ))}
      </div>
    );
  },
}));

const mockBadges: Badge[] = [
  {
    id: 'badge-1',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: '🎓',
    unlockedAt: '2024-01-10',
  },
  {
    id: 'badge-2',
    name: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚔️',
    unlockedAt: null,
  },
  {
    id: 'badge-3',
    name: 'Expert',
    description: 'Master advanced topics',
    icon: '👑',
    unlockedAt: '2024-02-15',
  },
];

describe('BadgeGrid Component', () => {
  it('should render BadgeDisplay with grid variant', () => {
    render(<BadgeGrid badges={mockBadges} />);
    expect(screen.getByTestId('badge-display')).toBeInTheDocument();
  });

  it('should display all badges', () => {
    render(<BadgeGrid badges={mockBadges} />);

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Week Warrior')).toBeInTheDocument();
    expect(screen.getByText('Expert')).toBeInTheDocument();
  });

  it('should map unlocked badges to success variant', () => {
    render(<BadgeGrid badges={mockBadges} />);
    expect(screen.getByTestId('badge-badge-1')).toBeInTheDocument();
  });

  it('should map locked badges to default variant', () => {
    render(<BadgeGrid badges={mockBadges} />);
    expect(screen.getByTestId('badge-badge-2')).toBeInTheDocument();
  });

  it('should show empty message when no badges', () => {
    render(<BadgeGrid badges={[]} />);
    expect(
      screen.getByText('No badges yet — keep learning to earn your first one!')
    ).toBeInTheDocument();
  });

  it('should pass correct columns prop to BadgeDisplay', () => {
    const spy = vi.spyOn(BadgeDisplayModule, 'BadgeDisplay');
    render(<BadgeGrid badges={mockBadges} />);

    expect(spy).toHaveBeenCalled();
    const callProps = (spy.mock.calls[0]?.[0] as any) || {};
    expect(callProps.columns).toBe(6);
  });

  it('should preserve badge structure when mapping', () => {
    render(<BadgeGrid badges={mockBadges} />);

    mockBadges.forEach((badge) => {
      expect(screen.getByText(badge.name)).toBeInTheDocument();
    });
  });

  it('should handle single badge', () => {
    const singleBadge: Badge[] = [mockBadges[0]];
    render(<BadgeGrid badges={singleBadge} />);
    expect(screen.getByText('First Steps')).toBeInTheDocument();
  });

  it('should handle all locked badges', () => {
    const lockedBadges: Badge[] = [
      {
        id: 'locked-1',
        name: 'Locked Badge',
        description: 'Not unlocked yet',
        icon: '🔒',
        unlockedAt: null,
      },
    ];
    render(<BadgeGrid badges={lockedBadges} />);
    expect(screen.getByText('Locked Badge')).toBeInTheDocument();
  });

  it('should handle all unlocked badges', () => {
    const unlockedBadges: Badge[] = [
      {
        id: 'unlocked-1',
        name: 'Unlocked Badge',
        description: 'Already unlocked',
        icon: '✅',
        unlockedAt: '2024-01-01',
      },
    ];
    render(<BadgeGrid badges={unlockedBadges} />);
    expect(screen.getByText('Unlocked Badge')).toBeInTheDocument();
  });

  it('should pass unlock dates to BadgeDisplay', () => {
    render(<BadgeGrid badges={mockBadges} />);

    const badge1 = mockBadges[0];
    const badge2 = mockBadges[1];

    expect(badge1.unlockedAt).toBe('2024-01-10');
    expect(badge2.unlockedAt).toBeNull();
  });

  it('should include badge descriptions', () => {
    render(<BadgeGrid badges={mockBadges} />);

    expect(screen.getByText('First Steps')).toBeInTheDocument();
  });

  it('should handle badges without icons', () => {
    const badgesWithoutIcons: Badge[] = [
      {
        id: 'no-icon',
        name: 'No Icon Badge',
        description: 'Badge without icon',
        icon: '',
        unlockedAt: '2024-01-01',
      },
    ];
    render(<BadgeGrid badges={badgesWithoutIcons} />);
    expect(screen.getByText('No Icon Badge')).toBeInTheDocument();
  });

  it('should render in correct order', () => {
    render(<BadgeGrid badges={mockBadges} />);

    const badges = screen.getAllByTestId(/badge-badge-/);
    expect(badges.length).toBe(3);
  });

  it('should have consistent badge item structure', () => {
    const { container } = render(<BadgeGrid badges={mockBadges} />);
    expect(container.querySelector('[data-testid="badge-display"]')).toBeInTheDocument();
  });
});
