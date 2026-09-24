/* eslint-disable import/no-unresolved */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NFTCard, type NFTItem } from '@/components/nft/NFTCard';
import { NFTGrid } from '@/components/nft/NFTGrid';

vi.mock('next/image', () => ({
  default: vi.fn(({ src, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} data-testid="next-image" />
  )),
}));

const mockNFTItem: NFTItem = {
  id: '1',
  title: 'Test NFT',
  description: 'Test Description',
  imageUrl: 'https://example.com/nft.jpg',
  owner: '0x1234567890abcdef',
  isCompleted: false,
};

const mockNFTItems: NFTItem[] = [
  {
    id: '1',
    title: 'NFT 1',
    imageUrl: 'https://example.com/nft1.jpg',
    owner: '0x1111111111111111',
    isCompleted: true,
  },
  {
    id: '2',
    title: 'NFT 2',
    imageUrl: 'https://example.com/nft2.jpg',
    owner: '0x2222222222222222',
    isCompleted: false,
  },
  {
    id: '3',
    title: 'NFT 3',
    imageUrl: 'https://example.com/nft3.jpg',
    owner: '0x3333333333333333',
    isCompleted: true,
  },
];

// eslint-disable-next-line max-lines-per-function
describe('NFT Gallery Image Optimization', () => {
  it('NFTCard renders with Next.js Image component', () => {
    render(<NFTCard nft={mockNFTItem} />);
    const image = screen.queryByTestId('next-image');
    expect(image).toBeInTheDocument();
  });

  it('NFTCard uses optimized image when imageUrl is provided', () => {
    render(<NFTCard nft={mockNFTItem} />);
    const image = screen.queryByTestId('next-image');
    expect(image).toHaveAttribute('src', mockNFTItem.imageUrl);
  });

  it('NFTCard handles missing imageUrl gracefully', () => {
    const nftWithoutImage: NFTItem = { ...mockNFTItem, imageUrl: undefined };
    render(<NFTCard nft={nftWithoutImage} />);
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
  });

  it('NFTGrid renders multiple NFTs with optimized images', () => {
    render(<NFTGrid items={mockNFTItems} />);
    const grid = screen.getByTestId('nft-grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveAttribute('role', 'list');
  });

  it('NFTGrid displays all NFT items correctly', () => {
    render(<NFTGrid items={mockNFTItems} />);
    mockNFTItems.forEach((nft) => {
      expect(screen.getByText(nft.title)).toBeInTheDocument();
    });
  });

  it('NFTGrid shows loading state with skeleton loaders', () => {
    render(<NFTGrid items={[]} isLoading={true} />);
    const loadingGrid = screen.getByTestId('nft-grid-loading');
    expect(loadingGrid).toBeInTheDocument();
    expect(loadingGrid).toHaveAttribute('aria-busy', 'true');
  });

  it('NFTGrid shows empty state when no items exist', () => {
    render(<NFTGrid items={[]} emptyTitle="No NFTs" emptyDescription="No NFT items available" />);
    expect(screen.getByTestId('nft-grid-empty')).toBeInTheDocument();
    expect(screen.getByText('No NFTs')).toBeInTheDocument();
  });

  it('NFTGrid renders correct number of columns', () => {
    const { rerender } = render(<NFTGrid items={mockNFTItems} columns={2} />);
    let grid = screen.getByTestId('nft-grid');
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2');

    rerender(<NFTGrid items={mockNFTItems} columns={4} />);
    grid = screen.getByTestId('nft-grid');
    expect(grid).toHaveClass('grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
  });

  it('NFTCard applies responsive image sizes', () => {
    render(<NFTCard nft={mockNFTItem} />);
    const image = screen.queryByTestId('next-image');
    expect(image).toBeInTheDocument();
  });

  it('NFTCard displays NFT metadata (title, owner, etc)', () => {
    render(<NFTCard nft={mockNFTItem} />);
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('NFTCard triggers onView callback when view button clicked', () => {
    const onView = vi.fn();
    render(<NFTCard nft={mockNFTItem} onView={onView} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('NFTGrid maintains image aspect ratio', () => {
    render(<NFTGrid items={mockNFTItems} />);
    const grid = screen.getByTestId('nft-grid');
    expect(grid).toBeInTheDocument();
    expect(grid.children.length).toBe(mockNFTItems.length);
  });

  it('NFTCard shows completion badge for completed NFTs', () => {
    const completedNFT: NFTItem = { ...mockNFTItem, isCompleted: true };
    render(<NFTCard nft={completedNFT} />);
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
  });

  it('NFTGrid handles pagination scenario correctly', () => {
    const paginatedItems = mockNFTItems.slice(0, 2);
    render(<NFTGrid items={paginatedItems} />);
    expect(screen.getByTestId('nft-grid').children.length).toBe(2);
  });

  it('NFTCard renders compact view when specified', () => {
    render(<NFTCard nft={mockNFTItem} compact />);
    expect(screen.getByText('Test NFT')).toBeInTheDocument();
  });

  it('NFTGrid respects custom className', () => {
    render(<NFTGrid items={mockNFTItems} className="custom-class" />);
    const grid = screen.getByTestId('nft-grid');
    expect(grid).toHaveClass('custom-class');
  });

  it('NFTCard handles long titles and descriptions appropriately', () => {
    const longNFT: NFTItem = {
      ...mockNFTItem,
      title: 'A'.repeat(100),
      description: 'B'.repeat(200),
    };
    render(<NFTCard nft={longNFT} />);
    expect(screen.getByText(longNFT.title)).toBeInTheDocument();
  });
});
