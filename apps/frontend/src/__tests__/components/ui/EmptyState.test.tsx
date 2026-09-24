import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('renders with title and description', () => {
    render(<EmptyState title="No items found" description="Start by adding your first item" />);
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('Start by adding your first item')).toBeInTheDocument();
  });

  it('renders empty state icon', () => {
    const { container } = render(
      <EmptyState title="No results" description="Try adjusting your search" />
    );
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders action button when provided', async () => {
    const mockAction = vi.fn();
    const user = userEvent.setup();
    render(
      <EmptyState
        title="No items"
        description="Create one now"
        actionLabel="Create Item"
        onAction={mockAction}
      />
    );

    const button = screen.getByRole('button', { name: 'Create Item' });
    await user.click(button);
    expect(mockAction).toHaveBeenCalledOnce();
  });

  it('does not render action button when handler not provided', () => {
    render(<EmptyState title="No items" description="Create one now" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('accepts custom icon', () => {
    const CustomIcon = () => <span data-testid="custom-icon">📦</span>;
    render(<EmptyState title="No items" description="Add one" icon={<CustomIcon />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState title="No items" description="Add one" className="custom-empty" />
    );
    expect(container.firstChild).toHaveClass('custom-empty');
  });
});
