import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingState } from '@/components/ui/LoadingState';

describe('LoadingState', () => {
  it('renders with default label', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<LoadingState label="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders spinner component', () => {
    const { container } = render(<LoadingState />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<LoadingState className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays optional description', () => {
    render(<LoadingState description="Please wait while we fetch your data" />);
    expect(screen.getByText('Please wait while we fetch your data')).toBeInTheDocument();
  });
});
