import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletConnectButton } from '@/components/wallet/WalletConnectButton';
import * as walletModule from '@/lib/wallet';

vi.mock('@/lib/wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wallet')>();
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

describe('WalletConnectButton Component', () => {
  it('renders Connect Wallet button when disconnected', () => {
    vi.mocked(walletModule.useWallet).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: null,
      clearError: vi.fn(),
    } as any);

    render(<WalletConnectButton />);
    expect(screen.getByTestId('wallet-connect-button')).toBeInTheDocument();
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });

  it('renders connecting spinner when isConnecting is true', () => {
    vi.mocked(walletModule.useWallet).mockReturnValue({
      isConnected: false,
      isConnecting: true,
      error: null,
      clearError: vi.fn(),
    } as any);

    render(<WalletConnectButton />);
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
    expect(screen.getByTestId('wallet-connect-button')).toBeDisabled();
  });

  it('renders null when already connected', () => {
    vi.mocked(walletModule.useWallet).mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      clearError: vi.fn(),
    } as any);

    const { container } = render(<WalletConnectButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('displays error message and handles dismiss', async () => {
    const clearErrorMock = vi.fn();
    vi.mocked(walletModule.useWallet).mockReturnValue({
      isConnected: false,
      isConnecting: false,
      error: { code: 'CONNECT_REJECTED', message: 'User rejected connection' },
      clearError: clearErrorMock,
    } as any);

    render(<WalletConnectButton />);
    expect(screen.getByRole('alert')).toHaveTextContent('User rejected connection');

    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    const user = userEvent.setup();
    await user.click(dismissBtn);
    expect(clearErrorMock).toHaveBeenCalled();
  });
});
