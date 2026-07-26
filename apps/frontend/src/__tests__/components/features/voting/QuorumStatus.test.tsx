import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuorumStatus } from '@/components/features/voting/QuorumStatus';

describe('QuorumStatus', () => {
  it('renders quorum status when reached', () => {
    render(<QuorumStatus totalVotes={100} quorumRequired={80} />);
    expect(screen.getByText('✓ Reached')).toBeInTheDocument();
  });

  it('renders quorum status when not reached', () => {
    render(<QuorumStatus totalVotes={50} quorumRequired={80} />);
    expect(screen.getByText('Not Reached')).toBeInTheDocument();
  });

  it('displays vote counts', () => {
    render(<QuorumStatus totalVotes={100} quorumRequired={80} />);
    expect(screen.getByText('100 votes cast')).toBeInTheDocument();
    expect(screen.getByText('80 required')).toBeInTheDocument();
  });

  it('applies green color when quorum reached', () => {
    const { container } = render(<QuorumStatus totalVotes={100} quorumRequired={80} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-green-500');
  });

  it('applies orange color when quorum not reached', () => {
    const { container } = render(<QuorumStatus totalVotes={50} quorumRequired={80} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-orange-500');
  });

  it('caps progress bar at 100%', () => {
    const { container } = render(<QuorumStatus totalVotes={150} quorumRequired={100} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveStyle('width: 100%');
  });

  it('calculates correct percentage', () => {
    const { container } = render(<QuorumStatus totalVotes={50} quorumRequired={100} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveStyle('width: 50%');
  });

  it('has proper aria attributes', () => {
    const { container } = render(<QuorumStatus totalVotes={100} quorumRequired={80} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '80');
  });
});
