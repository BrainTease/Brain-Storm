import type { Meta, StoryObj } from '@storybook/react';
import { NFTCard, type NFTItem } from './NFTCard';

const sampleNft: NFTItem = {
  id: '42',
  title: 'Soroban Security Specialist NFT',
  courseName: 'Smart Contract Auditing on Soroban',
  description: 'Verified proof of completion for advanced Soroban security and fuzz testing.',
  owner: 'GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ',
  price: 75,
  currency: 'BST',
  royaltyBasis: 500,
  isListed: true,
  isCompleted: true,
  txHash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
};

const meta: Meta<typeof NFTCard> = {
  title: 'Components/NFT/NFTCard',
  component: NFTCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NFTCard>;

export const ListedNFT: Story = {
  args: {
    nft: sampleNft,
    onBuy: (nft) => alert(`Buying NFT ${nft.id}`),
    onView: (nft) => alert(`Viewing NFT ${nft.id}`),
  },
};

export const UnlistedCertificate: Story = {
  args: {
    nft: {
      ...sampleNft,
      isListed: false,
      price: undefined,
      issuedAt: '2026-03-15T12:00:00Z',
    },
    onList: (nft) => alert(`Listing NFT ${nft.id}`),
    onTransfer: (nft) => alert(`Transferring NFT ${nft.id}`),
    onView: (nft) => alert(`Viewing NFT ${nft.id}`),
  },
};

export const CompactView: Story = {
  args: {
    nft: sampleNft,
    compact: true,
    onView: (nft) => alert(`Viewing NFT ${nft.id}`),
  },
};
