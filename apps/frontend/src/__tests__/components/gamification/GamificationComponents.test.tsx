import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { XpProgress } from '@/components/gamification/XpProgress';
import { StreakIndicator } from '@/components/gamification/StreakIndicator';
import { BadgeGrid } from '@/components/gamification/BadgeGrid';
import type { Badge } from '@/components/gamification/BadgeGrid';

describe('XpProgress', () => {
  it('renders level and xp values', () => {
    render(<XpProgress xp={250} level={3} xpForNextLevel={500} />);
    expect(screen.getByText('Level 3')).toBeInTheDocument();
    expect(screen.getByText('250 / 500 XP')).toBeInTheDocument();
  });

  it('calculates percentage correctly', () => {
    render(<XpProgress xp={50} level={1} xpForNextLevel={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
  });

  it('clamps percentage at 100', () => {
    render(<XpProgress xp={1000} level={10} xpForNextLevel={1000} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('StreakIndicator', () => {
  it('renders current streak and best streak', () => {
    render(<StreakIndicator streak={7} longestStreak={21} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('day streak')).toBeInTheDocument();
    expect(screen.getByText('best streak')).toBeInTheDocument();
  });

  it('renders zero streak gracefully', () => {
    render(<StreakIndicator streak={0} longestStreak={0} />);
    expect(screen.getAllByText('0')).toHaveLength(2);
  });
});

describe('BadgeGrid', () => {
  const badges: Badge[] = [
    { id: '1', name: 'First Steps', description: 'Complete lesson', icon: '⭐', unlockedAt: '2026-01-01T00:00:00Z' },
    { id: '2', name: 'Scholar', description: 'Complete 10 courses', icon: '🎓', unlockedAt: null },
  ];

  it('renders all badges', () => {
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Scholar')).toBeInTheDocument();
  });

  it('shows empty state when no badges', () => {
    render(<BadgeGrid badges={[]} />);
    expect(screen.getByText(/no badges yet/i)).toBeInTheDocument();
  });

  it('shows unlock date for unlocked badges', () => {
    render(<BadgeGrid badges={badges} />);
    expect(screen.getByText('1/1/2026')).toBeInTheDocument();
  });
});
