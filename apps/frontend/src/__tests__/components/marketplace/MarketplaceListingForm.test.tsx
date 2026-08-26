import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarketplaceListingForm } from '@/components/marketplace/MarketplaceListingForm';

describe('MarketplaceListingForm Component', () => {
  it('renders create listing form with required fields', () => {
    const handleSubmit = vi.fn();
    render(<MarketplaceListingForm mode="create" onSubmit={handleSubmit} />);

    expect(screen.getByRole('form', { name: /create marketplace listing/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/listing title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /publish listing/i })).toBeInTheDocument();
  });

  it('renders edit listing form with pre-populated values', () => {
    const handleSubmit = vi.fn();
    render(
      <MarketplaceListingForm
        mode="edit"
        initialValues={{
          title: 'Special NFT Certificate',
          price: 50,
          quantity: 2,
          currency: 'XLM',
        }}
        onSubmit={handleSubmit}
      />
    );

    expect(screen.getByRole('form', { name: /edit marketplace listing/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Special NFT Certificate')).toBeInTheDocument();
    expect(screen.getByDisplayValue('50')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('calls onSubmit when valid data is submitted', async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn();
    render(<MarketplaceListingForm mode="create" onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/listing title/i), 'Soroban Smart Contracts 101');
    await user.type(screen.getByLabelText(/price/i), '25');

    const submitBtn = screen.getByRole('button', { name: /publish listing/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
    });
  });
});
