import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  RoyaltyTransactionHistory,
  type RoyaltyTx,
} from '@/components/royalties/RoyaltyTransactionHistory';

const mockTransactions: RoyaltyTx[] = [
  {
    id: 'tx-1',
    date: '2024-01-15',
    course: 'Blockchain Basics',
    recipient: 'GCVD3ZB3KKRQRUVJMSCG3XFQT3ZYVP3PJQW2LYAAA4JXYHLYGTW3XYZ',
    royaltyPct: 5,
    amount: '100.50',
    txHash: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc1',
  },
  {
    id: 'tx-2',
    date: '2024-01-16',
    course: 'Advanced Smart Contracts',
    recipient: 'GCVD3ZB3KKRQRUVJMSCG3XFQT3ZYVP3PJQW2LYAAA4JXYHLYGTW3XYZ',
    royaltyPct: 8,
    amount: '250.75',
    txHash: 'def456ghi789def456ghi789def456ghi789def456ghi789def456ghi789def456',
  },
];

describe('RoyaltyTransactionHistory Component', () => {
  it('should render with title', () => {
    render(<RoyaltyTransactionHistory transactions={[]} />);
    expect(screen.getByText('Royalty Payments')).toBeInTheDocument();
  });

  it('should render DataGrid with transactions', () => {
    render(<RoyaltyTransactionHistory transactions={mockTransactions} />);

    expect(screen.getByText('Blockchain Basics')).toBeInTheDocument();
    expect(screen.getByText('Advanced Smart Contracts')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(<RoyaltyTransactionHistory transactions={[]} isLoading={true} />);

    expect(screen.getByText('Royalty Payments')).toBeInTheDocument();
  });

  it('should display amounts in correct format', () => {
    render(<RoyaltyTransactionHistory transactions={mockTransactions} />);

    expect(screen.getByText('100.50 BST')).toBeInTheDocument();
    expect(screen.getByText('250.75 BST')).toBeInTheDocument();
  });

  it('should display royalty percentages', () => {
    render(<RoyaltyTransactionHistory transactions={mockTransactions} />);

    expect(screen.getByText('5%')).toBeInTheDocument();
    expect(screen.getByText('8%')).toBeInTheDocument();
  });

  it('should truncate recipient addresses', () => {
    render(<RoyaltyTransactionHistory transactions={mockTransactions} />);

    const recipientElements = screen.getAllByText(/GC.*….*YZ/);
    expect(recipientElements.length).toBeGreaterThan(0);
  });

  it('should render transaction hash links to Stellar Expert', () => {
    render(<RoyaltyTransactionHistory transactions={mockTransactions} />);

    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => {
      expect(link.href).toContain('stellar.expert/explorer');
    });
  });

  it('should handle empty transaction list', () => {
    render(<RoyaltyTransactionHistory transactions={[]} />);

    expect(screen.getByText('Royalty Payments')).toBeInTheDocument();
  });

  it('should have proper ARIA labels for accessibility', () => {
    render(<RoyaltyTransactionHistory transactions={mockTransactions} />);

    expect(screen.getByLabelText('Royalty transaction history')).toBeInTheDocument();
  });

  it('should render dates correctly', () => {
    render(<RoyaltyTransactionHistory transactions={mockTransactions} />);

    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
    expect(screen.getByText('2024-01-16')).toBeInTheDocument();
  });

  it('should display transaction hash truncated format', () => {
    render(<RoyaltyTransactionHistory transactions={mockTransactions} />);

    expect(screen.getByText('abc123…56abc1')).toBeInTheDocument();
    expect(screen.getByText('def456…89def456')).toBeInTheDocument();
  });

  it('should handle missing transaction hash gracefully', () => {
    const transactionsWithoutHash: RoyaltyTx[] = [
      {
        ...mockTransactions[0],
        txHash: undefined,
      },
    ];

    render(<RoyaltyTransactionHistory transactions={transactionsWithoutHash} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });
});
