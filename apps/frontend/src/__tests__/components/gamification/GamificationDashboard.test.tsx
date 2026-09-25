import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { GamificationDashboard } from '@/components/gamification/GamificationDashboard';
import * as useGamificationModule from '@/hooks/useGamification';

vi.mock('@/hooks/useGamification');
vi.mock('@/components/gamification/ReputationScoreWidget', () => ({
  ReputationScoreWidget: ({ level, xp, xpForNextLevel, streak, longestStreak }: any) => (
    <div data-testid="reputation-widget">
      <div>Level: {level}</div>
      <div>
        XP: {xp}/{xpForNextLevel}
      </div>
      <div>
        Streak: {streak}/{longestStreak}
      </div>
    </div>
  ),
}));

vi.mock('@/components/gamification/BadgeGrid', () => ({
  BadgeGrid: ({ badges }: any) => (
    <div data-testid="badge-grid">
      {badges.map((b: any) => (
        <div key={b.id}>{b.name}</div>
      ))}
    </div>
  ),
}));

const mockGamificationData = {
  xp: 2500,
  level: 5,
  xpForNextLevel: 3000,
  streak: 7,
  longestStreak: 21,
  badges: [
    {
      id: '1',
      name: 'First Steps',
      description: 'First lesson',
      icon: '🎓',
      unlockedAt: '2024-01-01',
    },
    {
      id: '2',
      name: 'Streaker',
      description: '7 day streak',
      icon: '🔥',
      unlockedAt: '2024-01-15',
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GamificationDashboard Component', () => {
  it('should render loading state', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);
    expect(screen.getByLabelText('Loading gamification data')).toBeInTheDocument();
  });

  it('should render gamification data when loaded', async () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);

    expect(screen.getByTestId('reputation-widget')).toBeInTheDocument();
    expect(screen.getByTestId('badge-grid')).toBeInTheDocument();
  });

  it('should display user level', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);
    expect(screen.getByText('Level: 5')).toBeInTheDocument();
  });

  it('should display XP progress', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);
    expect(screen.getByText('XP: 2500/3000')).toBeInTheDocument();
  });

  it('should display streak information', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);
    expect(screen.getByText('Streak: 7/21')).toBeInTheDocument();
  });

  it('should display badges section', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);
    expect(screen.getByText('Badges')).toBeInTheDocument();
  });

  it('should render error state with retry button', async () => {
    const mockRefresh = vi.fn();
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: 'Failed to load gamification data.',
      refresh: mockRefresh,
    });

    render(<GamificationDashboard userId="user-123" />);

    expect(screen.getByText('Failed to load gamification data.')).toBeInTheDocument();
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    await userEvent.click(retryButton);
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should return null when no data and not loading', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    const { container } = render(<GamificationDashboard userId="user-123" />);
    expect(container.firstChild).toBeNull();
  });

  it('should call useGamification with correct userId', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-456" />);
    expect(useGamificationModule.useGamification).toHaveBeenCalledWith('user-456');
  });

  it('should display all badges from data', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Streaker')).toBeInTheDocument();
  });

  it('should have proper ARIA labels', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);
    expect(screen.getByLabelText('Badges')).toBeInTheDocument();
  });

  it('should handle zero badges', () => {
    const dataWithNoBadges = { ...mockGamificationData, badges: [] };
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: dataWithNoBadges,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<GamificationDashboard userId="user-123" />);
    expect(screen.getByTestId('badge-grid')).toBeInTheDocument();
  });

  it('should display correct space structure', () => {
    (useGamificationModule.useGamification as any).mockReturnValue({
      data: mockGamificationData,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });

    const { container } = render(<GamificationDashboard userId="user-123" />);
    const mainDiv = container.querySelector('.space-y-8');
    expect(mainDiv).toBeInTheDocument();
  });
});
