import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ErrorState } from '@/components/ui/ErrorState';

describe('ErrorState', () => {
  it('renders error icon', () => {
    render(<ErrorState title="Error" message="Something went wrong" />);
    const container = screen.getByRole('alert');
    expect(container).toBeInTheDocument();
  });

  it('displays title and message', () => {
    render(<ErrorState title="Network Error" message="Failed to load data" />);
    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('renders retry button when handler provided', async () => {
    const mockRetry = vi.fn();
    const user = userEvent.setup();
    render(<ErrorState title="Error" message="Something failed" onRetry={mockRetry} />);

    const retryButton = screen.getByRole('button', { name: /retry/i });
    await user.click(retryButton);
    expect(mockRetry).toHaveBeenCalledOnce();
  });

  it('does not render retry button when handler not provided', () => {
    render(<ErrorState title="Error" message="Something failed" />);
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ErrorState title="Error" message="Something failed" className="custom-error" />
    );
    expect(container.firstChild).toHaveClass('custom-error');
  });

  it('displays error code when provided', () => {
    render(<ErrorState title="Error" message="Something failed" errorCode="500" />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });
});
