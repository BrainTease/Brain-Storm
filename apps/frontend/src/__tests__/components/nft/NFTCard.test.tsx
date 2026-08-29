import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NFTCard, type NFTItem } from '@/components/nft/NFTCard';

const mockNft: NFTItem = {
  id: '101',
  title: 'Soroban Security Specialist',
  courseName: 'Soroban 101',
  description: 'Certified security auditor badge on Stellar Soroban.',
  owner: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ',
  price: 50,
  currency: 'BST',
  royaltyBasis: 500,
  isListed: true,
  isCompleted: true,
  txHash: '0x123456789abcdef',
};

describe('NFTCard Component', () => {
  it('renders card title, ID, and metadata badges', () => {
    render(<NFTCard nft={mockNft} />);

    expect(screen.getByText('Soroban Security Specialist')).toBeInTheDocument();
    expect(screen.getByText('#101')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Listed')).toBeInTheDocument();
    expect(screen.getByText('5.0%')).toBeInTheDocument();
    expect(screen.getByText('50 BST')).toBeInTheDocument();
  });

  it('triggers onBuy when Buy NFT button is clicked', async () => {
    const user = userEvent.setup();
    const handleBuy = vi.fn();
    render(<NFTCard nft={mockNft} onBuy={handleBuy} />);

    const buyBtn = screen.getByRole('button', { name: /buy nft/i });
    await user.click(buyBtn);
    expect(handleBuy).toHaveBeenCalledWith(mockNft);
  });

  it('triggers onView when View button is clicked', async () => {
    const user = userEvent.setup();
    const handleView = vi.fn();
    render(<NFTCard nft={mockNft} onView={handleView} />);

    const viewBtn = screen.getByRole('button', { name: /view/i });
    await user.click(viewBtn);
    expect(handleView).toHaveBeenCalledWith(mockNft);
  });
});
