import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionModal } from '@/components/wallet/TransactionModal';

// Stub the wallet hook
vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({ walletType: 'freighter', address: 'GABC1234' }),
}));

// Stub toast
vi.mock('@/lib/toast', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('TransactionModal', () => {
  const onClose = vi.fn();
  const onSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders in build step with description', () => {
    render(
      <TransactionModal
        xdr="AAAA=="
        description="Enroll in course"
        onClose={onClose}
        onSuccess={onSuccess}
      />
    );
    expect(screen.getByText('Review Transaction')).toBeInTheDocument();
    expect(screen.getByText('Enroll in course')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign/i })).toBeInTheDocument();
  });

  it('shows the signing address', () => {
    render(<TransactionModal xdr="AAAA==" onClose={onClose} />);
    expect(screen.getByText('GABC1234')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked in build step', () => {
    render(<TransactionModal xdr="AAAA==" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape key in build step', () => {
    render(<TransactionModal xdr="AAAA==" onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders step indicator with four steps', () => {
    render(<TransactionModal xdr="AAAA==" onClose={onClose} />);
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Sign')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
