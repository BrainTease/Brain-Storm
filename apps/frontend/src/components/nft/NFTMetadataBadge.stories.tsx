import type { Meta, StoryObj } from '@storybook/react';
import { NFTMetadataBadge } from './NFTMetadataBadge';

const meta: Meta<typeof NFTMetadataBadge> = {
  title: 'Components/NFT/NFTMetadataBadge',
  component: NFTMetadataBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NFTMetadataBadge>;

export const Default: Story = {
  args: {
    label: 'Token ID',
    value: '#1042',
    variant: 'neutral',
  },
};

export const Royalty: Story = {
  args: {
    label: 'Royalty',
    value: '5.0%',
    variant: 'royalty',
  },
};

export const SuccessStatus: Story = {
  args: {
    label: 'Verified On-Chain',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    label: 'Pending Transfer',
    variant: 'warning',
  },
};

export const Primary: Story = {
  args: {
    label: 'Listed for Sale',
    variant: 'primary',
  },
};
