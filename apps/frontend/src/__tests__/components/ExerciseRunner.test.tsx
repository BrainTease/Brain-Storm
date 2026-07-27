import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExerciseRunner } from '@/components/exercise/ExerciseRunner';
import { runExercise, supportsSandbox } from '@/components/exercise/SandboxRunner';
import type { Exercise } from '@brain-storm/types';

const mockExercise: Exercise = {
  id: 'ex-1',
  lessonId: 'lesson-1',
  title: 'Hello World',
  description: 'Write a function that returns "hello"',
  instruction: 'Implement the run function that returns "hello"',
  starter: {
    language: 'javascript',
    code: 'function run() {\n  // your code\n}',
  },
  testCases: [
    {
      id: 'tc-1',
      name: 'Should return hello',
      input: '',
      expectedOutput: 'hello',
      weight: 1,
    },
  ],
  xpReward: 50,
};

describe('ExerciseRunner', () => {
  it('renders exercise title and description', () => {
    render(<ExerciseRunner exercise={mockExercise} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(screen.getByText('50 XP')).toBeInTheDocument();
  });

  it('renders code editor with starter code', () => {
    render(<ExerciseRunner exercise={mockExercise} />);
    expect(screen.getByText('Run Code')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('shows running state when run is clicked', async () => {
    const user = userEvent.setup();
    render(<ExerciseRunner exercise={mockExercise} />);
    await user.click(screen.getByText('Run Code'));
    expect(screen.getByText('Running tests…')).toBeInTheDocument();
  });

  it('calls onComplete with result when tests pass', async () => {
    const onComplete = vi.fn();
    const passingCode = 'function run() { return "hello"; }';
    render(
      <ExerciseRunner
        exercise={{ ...mockExercise, starter: { ...mockExercise.starter, code: passingCode } }}
        onComplete={onComplete}
      />,
    );

    const user = userEvent.setup();
    await user.click(screen.getByText('Run Code'));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          exerciseId: 'ex-1',
          passed: true,
          xpAwarded: 50,
        }),
      );
    });
  });
});

describe('runExercise', () => {
  it('returns passed results when code is correct', () => {
    const code = 'function run() { return "hello"; }';
    const result = runExercise(code, mockExercise.testCases, 50);
    expect(result.testResults[0].passed).toBe(true);
    expect(result.xpEarned).toBe(50);
  });

  it('returns failed results when code is wrong', () => {
    const code = 'function run() { return "wrong"; }';
    const result = runExercise(code, mockExercise.testCases, 50);
    expect(result.testResults[0].passed).toBe(false);
    expect(result.xpEarned).toBeLessThan(50);
  });
});

describe('supportsSandbox', () => {
  it('returns true in test environment', () => {
    expect(supportsSandbox()).toBe(true);
  });
});
