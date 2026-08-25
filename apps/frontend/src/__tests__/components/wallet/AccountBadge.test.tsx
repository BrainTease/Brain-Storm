import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountBadge } from '@/components/wallet/AccountBadge';
import * as walletModule from '@/lib/wallet';

vi.mock('@/lib/wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wallet')>();
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

describe('AccountBadge Component', () => {
  it('renders null when not connected', () => {
    vi.mocked(walletModule.useWallet).mockReturnValue({
      isConnected: false,
      truncatedAddress: null,
    } as any);

    const { container } = render(<AccountBadge />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders truncated address when connected', () => {
    vi.mocked(walletModule.useWallet).mockReturnValue({
      isConnected: true,
      address: 'GBQWPX7ZCWVLWZHYQAJMDJ4XYFMXRKNMZOVKN7MXGWPMZZZSZCDXWVT7',
      truncatedAddress: 'GBQW…WVT7',
      balance: '125.50',
      networkMismatch: false,
    } as any);

    render(<AccountBadge showBalance={true} />);
    expect(screen.getByTestId('account-badge')).toBeInTheDocument();
    expect(screen.getByText('GBQW…WVT7')).toBeInTheDocument();
    expect(screen.getByText('125.50 XLM')).toBeInTheDocument();
  });

  it('handles custom onClick handler', async () => {
    const handleClick = vi.fn();
    vi.mocked(walletModule.useWallet).mockReturnValue({
      isConnected: true,
      truncatedAddress: 'GBQW…WVT7',
      networkMismatch: false,
    } as any);

    render(<AccountBadge onClick={handleClick} />);
    const button = screen.getByTestId('account-badge');
    const user = userEvent.setup();
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
