import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NFTMetadataBadge } from '@/components/nft/NFTMetadataBadge';

describe('NFTMetadataBadge Component', () => {
  it('renders label and value', () => {
    render(<NFTMetadataBadge label="Royalty" value="5.0%" variant="royalty" />);
    expect(screen.getByText('Royalty')).toBeInTheDocument();
    expect(screen.getByText('5.0%')).toBeInTheDocument();
  });

  it('renders only label when value is omitted', () => {
    render(<NFTMetadataBadge label="Verified" variant="success" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });
});
