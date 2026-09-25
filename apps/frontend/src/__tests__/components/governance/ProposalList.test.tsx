/* eslint-disable import/no-unresolved */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProposalList } from '@/components/governance/ProposalList';
import { Proposal } from '@/store/governanceStore';

const mockProposals: Proposal[] = [
  {
    id: '1',
    title: 'Test Proposal 1',
    description: 'Description 1',
    status: 'active',
    createdAt: new Date().toISOString(),
    votingDeadline: new Date(Date.now() + 86400000).toISOString(),
    votesFor: 100,
    votesAgainst: 50,
    quorumRequired: 1000,
    votesRequired: 600,
    totalVotes: 150,
  },
  {
    id: '2',
    title: 'Test Proposal 2',
    description: 'Description 2',
    status: 'passed',
    createdAt: new Date().toISOString(),
    votingDeadline: new Date(Date.now() - 86400000).toISOString(),
    votesFor: 800,
    votesAgainst: 200,
    quorumRequired: 1000,
    votesRequired: 600,
    totalVotes: 1000,
  },
];

describe('ProposalList', () => {
  it('renders proposals in a grid layout', () => {
    render(<ProposalList proposals={mockProposals} />);
    const cards = screen.getAllByRole('link');
    expect(cards.length).toBeGreaterThanOrEqual(mockProposals.length);
  });

  it('shows spinner when loading with no proposals', () => {
    render(<ProposalList proposals={[]} loading={true} />);
    expect(screen.getByText(/Loading proposals/i)).toBeInTheDocument();
  });

  it('displays error message when error prop is set', () => {
    const errorMessage = 'Failed to fetch proposals';
    render(<ProposalList proposals={[]} error={errorMessage} />);
    expect(screen.getByText(/Failed to load proposals/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('shows "No proposals found" when proposals array is empty', () => {
    render(<ProposalList proposals={[]} />);
    expect(screen.getByText('No proposals found.')).toBeInTheDocument();
  });

  it('filters proposals by status when filter prop changes', () => {
    const { rerender } = render(<ProposalList proposals={mockProposals} filter="active" />);
    expect(screen.getByText('Test Proposal 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Proposal 2')).not.toBeInTheDocument();

    rerender(<ProposalList proposals={mockProposals} filter="passed" />);
    expect(screen.queryByText('Test Proposal 1')).not.toBeInTheDocument();
    expect(screen.getByText('Test Proposal 2')).toBeInTheDocument();
  });

  it('shows load more button when hasMore is true', () => {
    render(<ProposalList proposals={mockProposals} hasMore onLoadMore={() => {}} />);
    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('calls onLoadMore when load more button is clicked', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn();
    render(<ProposalList proposals={mockProposals} hasMore onLoadMore={onLoadMore} />);
    await user.click(screen.getByRole('button', { name: /load more/i }));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('disables load more button when loading', () => {
    render(<ProposalList proposals={mockProposals} hasMore loading onLoadMore={() => {}} />);
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });

  it('displays correct text for filtered status when no results', () => {
    render(<ProposalList proposals={mockProposals} filter="failed" />);
    expect(screen.getByText('No failed proposals found.')).toBeInTheDocument();
  });
});
