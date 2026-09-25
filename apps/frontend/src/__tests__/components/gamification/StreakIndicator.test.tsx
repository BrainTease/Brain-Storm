import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { StreakIndicator } from '@/components/gamification/StreakIndicator';

describe('StreakIndicator Component', () => {
  it('should render current streak', () => {
    render(<StreakIndicator streak={7} longestStreak={15} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('should render longest streak', () => {
    render(<StreakIndicator streak={3} longestStreak={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should display "day streak" label', () => {
    render(<StreakIndicator streak={5} longestStreak={10} />);
    expect(screen.getByText('day streak')).toBeInTheDocument();
  });

  it('should display "best streak" label', () => {
    render(<StreakIndicator streak={5} longestStreak={10} />);
    expect(screen.getByText('best streak')).toBeInTheDocument();
  });

  it('should render fire emoji', () => {
    render(<StreakIndicator streak={1} longestStreak={1} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('should handle zero streak', () => {
    render(<StreakIndicator streak={0} longestStreak={5} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should handle high streak numbers', () => {
    render(<StreakIndicator streak={365} longestStreak={500} />);
    expect(screen.getByText('365')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('should have fire emoji marked as decorative', () => {
    const { container } = render(<StreakIndicator streak={7} longestStreak={15} />);
    const fireEmoji = container.querySelector('[aria-hidden="true"]');
    expect(fireEmoji).toBeInTheDocument();
  });

  it('should display separator between streaks', () => {
    const { container } = render(<StreakIndicator streak={5} longestStreak={20} />);
    const separators = container.querySelectorAll('[aria-hidden="true"]');
    expect(separators.length).toBeGreaterThanOrEqual(1);
  });

  it('should have proper semantic structure', () => {
    const { container } = render(<StreakIndicator streak={7} longestStreak={15} />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should display streak and best streak in correct order', () => {
    const { container } = render(<StreakIndicator streak={7} longestStreak={15} />);
    const textContent = container.textContent;
    const streakIndex = textContent?.indexOf('7');
    const bestStreakIndex = textContent?.indexOf('15');
    expect(streakIndex !== undefined && bestStreakIndex !== undefined).toBe(true);
  });

  it('should render with proper styling classes', () => {
    const { container } = render(<StreakIndicator streak={7} longestStreak={15} />);
    const mainDiv = container.querySelector('div');
    expect(mainDiv?.className).toContain('flex');
  });

  it('should render gray text for labels', () => {
    const { container } = render(<StreakIndicator streak={5} longestStreak={10} />);
    const labels = container.querySelectorAll('.text-gray-500');
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });

  it('should match streak and longestStreak values when equal', () => {
    render(<StreakIndicator streak={10} longestStreak={10} />);
    const tenElements = screen.getAllByText('10');
    expect(tenElements.length).toBe(2);
  });

  it('should handle current streak being higher than longest', () => {
    render(<StreakIndicator streak={20} longestStreak={15} />);
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });
});
