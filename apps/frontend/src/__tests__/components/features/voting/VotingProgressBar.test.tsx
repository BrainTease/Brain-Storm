import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VotingProgressBar } from '@/components/features/voting/VotingProgressBar';

describe('VotingProgressBar', () => {
  it('renders label', () => {
    render(
      <VotingProgressBar
        label="In Favor"
        votes={100}
        percentage={50}
        color="green"
        total={200}
      />
    );
    expect(screen.getByText('In Favor')).toBeInTheDocument();
  });

  it('displays vote count and percentage', () => {
    render(
      <VotingProgressBar
        label="In Favor"
        votes={100}
        percentage={50}
        color="green"
        total={200}
      />
    );
    expect(screen.getByText('100 (50.0%)')).toBeInTheDocument();
  });

  it('renders progress bar with correct width', () => {
    const { container } = render(
      <VotingProgressBar
        label="In Favor"
        votes={100}
        percentage={50}
        color="green"
        total={200}
      />
    );
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveStyle('width: 50%');
  });

  it('applies green color for green variant', () => {
    const { container } = render(
      <VotingProgressBar
        label="In Favor"
        votes={100}
        percentage={50}
        color="green"
        total={200}
      />
    );
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-green-500');
  });

  it('applies red color for red variant', () => {
    const { container } = render(
      <VotingProgressBar
        label="Against"
        votes={100}
        percentage={50}
        color="red"
        total={200}
      />
    );
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-red-500');
  });

  it('has proper aria attributes', () => {
    const { container } = render(
      <VotingProgressBar
        label="In Favor"
        votes={100}
        percentage={50}
        color="green"
        total={200}
      />
    );
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '200');
  });

  it('formats large vote counts with commas', () => {
    render(
      <VotingProgressBar
        label="In Favor"
        votes={1000000}
        percentage={50}
        color="green"
        total={2000000}
      />
    );
    expect(screen.getByText(/1,000,000/)).toBeInTheDocument();
  });
});
