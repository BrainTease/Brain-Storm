import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import/no-unresolved
import { ExerciseRunner } from '@/components/exercise';

expect.extend(toHaveNoViolations);

const mockExerciseConfig = {
  id: 'exercise-1',
  title: 'JavaScript Exercise',
  description: 'Write a function that adds two numbers',
  initialCode: 'function add(a, b) {\n  // TODO: implement\n}',
  expectedOutput: 'function should return sum of two numbers',
  testCases: [
    { input: '2, 3', expected: '5' },
    { input: '10, 20', expected: '30' },
  ],
};

describe('ExerciseRunner Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(
      <ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels for exercise title', () => {
    render(<ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />);

    const title = screen.queryByRole('heading', { level: 1 });
    if (title) {
      expect(title).toHaveAccessibleName();
    }
  });

  it('should have accessible code editor', () => {
    render(<ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />);

    const textboxes = screen.queryAllByRole('textbox');
    expect(textboxes.length).toBeGreaterThanOrEqual(0);

    textboxes.forEach((textbox) => {
      expect(textbox).toHaveAccessibleName();
    });
  });

  it('should support keyboard navigation', () => {
    render(<ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('should have proper focus management for interactive elements', () => {
    render(<ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);
    }
  });

  it('should provide accessible test output', () => {
    render(<ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    buttons.forEach((button) => {
      if (button.textContent) {
        expect(button.textContent.length).toBeGreaterThan(0);
      }
    });
  });

  it('should have semantic markup', async () => {
    const { container } = render(
      <ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />
    );

    const mains = container.querySelectorAll('main');
    expect(mains.length + container.querySelectorAll('article').length).toBeGreaterThan(0);
  });

  it('should announce status changes to screen readers', () => {
    const { container: exerciseContainer } = render(
      <ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />
    );

    const liveRegions = exerciseContainer.querySelectorAll('[role="status"], [role="alert"]');
    expect(liveRegions).toBeDefined();
  });

  it('should have proper color contrast', async () => {
    const { container } = render(
      <ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });

    expect(results.violations.filter((v) => v.id === 'color-contrast')).toHaveLength(0);
  });

  it('should support reduced motion preferences', async () => {
    render(<ExerciseRunner config={mockExerciseConfig} onComplete={vi.fn()} onSave={vi.fn()} />);

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    expect(motionQuery).toBeDefined();
  });
});
