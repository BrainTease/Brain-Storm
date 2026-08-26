import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NFTGrid } from '@/components/nft/NFTGrid';
import type { NFTItem } from '@/components/nft/NFTCard';

const mockItems: NFTItem[] = [
  { id: '1', title: 'NFT One', isListed: true, price: 10 },
  { id: '2', title: 'NFT Two', isListed: false },
];

describe('NFTGrid Component', () => {
  it('renders list of NFT cards when items are provided', () => {
    render(<NFTGrid items={mockItems} />);

    expect(screen.getByTestId('nft-grid')).toBeInTheDocument();
    expect(screen.getByText('NFT One')).toBeInTheDocument();
    expect(screen.getByText('NFT Two')).toBeInTheDocument();
  });

  it('renders loading skeletons when isLoading is true', () => {
    render(<NFTGrid items={[]} isLoading={true} columns={3} />);

    expect(screen.getByTestId('nft-grid-loading')).toBeInTheDocument();
    expect(screen.getAllByTestId('nft-card-skeleton')).toHaveLength(6);
  });

  it('renders empty state when items are empty', () => {
    render(
      <NFTGrid
        items={[]}
        isLoading={false}
        emptyTitle="Custom Empty Title"
        emptyDescription="Custom Empty Description"
      />
    );

    expect(screen.getByTestId('nft-grid-empty')).toBeInTheDocument();
    expect(screen.getByText('Custom Empty Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Empty Description')).toBeInTheDocument();
  });
});
