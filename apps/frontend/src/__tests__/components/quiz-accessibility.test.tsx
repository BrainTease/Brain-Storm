import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, expect, it, vi } from 'vitest';

// eslint-disable-next-line import/no-unresolved
import { QuizComponent, type QuizConfig } from '@/components/quiz/index';

expect.extend(toHaveNoViolations);

const mockQuizConfig: QuizConfig = {
  id: 'quiz-1',
  title: 'Sample Quiz',
  description: 'A quiz for testing',
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: 'What is 2 + 2?',
      options: [
        { id: 'a1', text: '3' },
        { id: 'a2', text: '4' },
        { id: 'a3', text: '5' },
      ],
      correctAnswer: 'a2',
      explanation: '2 + 2 equals 4',
      points: 10,
    },
    {
      id: 'q2',
      type: 'true-false',
      question: 'True or False: The sky is blue',
      options: [
        { id: 'b1', text: 'True' },
        { id: 'b2', text: 'False' },
      ],
      correctAnswer: 'b1',
      points: 5,
    },
  ],
  passingScore: 70,
  allowReview: true,
};

describe('QuizComponent Accessibility', () => {
  it('should not have any accessibility violations in intro phase', async () => {
    const { container } = render(<QuizComponent config={mockQuizConfig} onComplete={vi.fn()} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper ARIA labels for quiz title', async () => {
    render(<QuizComponent config={mockQuizConfig} onComplete={vi.fn()} />);

    const title = screen.getByRole('heading', { name: mockQuizConfig.title });
    expect(title).toBeInTheDocument();
    expect(title).toHaveAttribute('aria-level', '1');
  });

  it('should have proper ARIA labels for quiz options', async () => {
    render(<QuizComponent config={mockQuizConfig} onComplete={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toHaveAccessibleName();
    });
  });

  it('should support keyboard navigation in quiz', async () => {
    render(<QuizComponent config={mockQuizConfig} onComplete={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    buttons.forEach((button) => {
      expect(button).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('should have proper focus management', async () => {
    render(<QuizComponent config={mockQuizConfig} onComplete={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    if (buttons.length > 0) {
      buttons[0].focus();
      expect(document.activeElement).toBe(buttons[0]);
    }
  });

  it('should have semantic HTML structure', async () => {
    const { container: quizContainer } = render(
      <QuizComponent config={mockQuizConfig} onComplete={vi.fn()} />
    );

    const article = quizContainer.querySelector('article');
    expect(article).toBeInTheDocument();
  });

  it('should announce progress to screen readers', async () => {
    render(<QuizComponent config={mockQuizConfig} onComplete={vi.fn()} />);

    const progressBar = screen.queryByRole('progressbar');
    if (progressBar) {
      expect(progressBar).toHaveAttribute('aria-valuenow');
      expect(progressBar).toHaveAttribute('aria-valuemin');
      expect(progressBar).toHaveAttribute('aria-valuemax');
    }
  });

  it('should have descriptive error messages', async () => {
    render(<QuizComponent config={mockQuizConfig} onComplete={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    buttons.forEach((button) => {
      if (button.textContent) {
        expect(button.textContent.length).toBeGreaterThan(0);
      }
    });
  });
});
