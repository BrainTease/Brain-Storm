import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NetworkSelector } from '@/components/wallet/NetworkSelector';
import * as walletModule from '@/lib/wallet';

vi.mock('@/lib/wallet', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/wallet')>();
  return {
    ...actual,
    useWallet: vi.fn(),
  };
});

describe('NetworkSelector Component', () => {
  it('renders current network label', () => {
    vi.mocked(walletModule.useWallet).mockReturnValue({
      network: 'TESTNET',
      networkMismatch: false,
    } as any);

    render(<NetworkSelector />);
    expect(screen.getByTestId('network-selector')).toBeInTheDocument();
    expect(screen.getByText('TESTNET')).toBeInTheDocument();
    expect(screen.queryByTestId('network-mismatch-badge')).not.toBeInTheDocument();
  });

  it('renders mismatch warning badge when networkMismatch is true', () => {
    vi.mocked(walletModule.useWallet).mockReturnValue({
      network: 'PUBLIC',
      networkMismatch: true,
    } as any);

    render(<NetworkSelector showMismatchWarning={true} />);
    expect(screen.getByTestId('network-mismatch-badge')).toBeInTheDocument();
    expect(screen.getByText('Mismatch')).toBeInTheDocument();
  });
});
