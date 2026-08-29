import type { Meta, StoryObj } from '@storybook/react';
import { NFTGrid } from './NFTGrid';
import type { NFTItem } from './NFTCard';

const sampleItems: NFTItem[] = [
  {
    id: '1',
    title: 'Soroban Security Specialist',
    courseName: 'Smart Contract Auditing',
    price: 75,
    currency: 'BST',
    royaltyBasis: 500,
    isListed: true,
    isCompleted: true,
  },
  {
    id: '2',
    title: 'Stellar Protocol Developer',
    courseName: 'Core Protocol Concepts',
    price: 120,
    currency: 'BST',
    royaltyBasis: 250,
    isListed: true,
    isCompleted: false,
  },
  {
    id: '3',
    title: 'Rust for Blockchain',
    courseName: 'Rust Fundamentals',
    isListed: false,
    issuedAt: '2026-02-10T10:00:00Z',
    isCompleted: true,
  },
];

const meta: Meta<typeof NFTGrid> = {
  title: 'Components/NFT/NFTGrid',
  component: NFTGrid,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NFTGrid>;

export const Default: Story = {
  args: {
    items: sampleItems,
    columns: 3,
  },
};

export const Loading: Story = {
  args: {
    items: [],
    isLoading: true,
    columns: 3,
  },
};

export const Empty: Story = {
  args: {
    items: [],
    isLoading: false,
    emptyTitle: 'No NFT Collectibles',
    emptyDescription: 'Complete courses or browse the market to acquire NFTs.',
  },
};
