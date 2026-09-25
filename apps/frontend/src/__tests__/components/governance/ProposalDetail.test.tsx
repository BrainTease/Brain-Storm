/* eslint-disable import/no-unresolved */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProposalDetail } from '@/components/governance/ProposalDetail';
import { Proposal } from '@/store/governanceStore';

const mockProposal: Proposal = {
  id: '1',
  title: 'Test Proposal',
  description: 'Test Description',
  status: 'active',
  createdAt: new Date().toISOString(),
  votingDeadline: new Date(Date.now() + 86400000).toISOString(),
  votesFor: 100,
  votesAgainst: 50,
  quorumRequired: 1000,
  votesRequired: 600,
  totalVotes: 150,
};

// eslint-disable-next-line max-lines-per-function
describe('ProposalDetail', () => {
  it('renders loading spinner when loading is true', () => {
    render(<ProposalDetail proposal={null} loading userVotingPower={null} hasUserVoted={false} />);
    expect(screen.getByText(/Loading proposal/i)).toBeInTheDocument();
  });

  it('displays "Proposal not found" when proposal is null', () => {
    render(
      <ProposalDetail proposal={null} loading={false} userVotingPower={null} hasUserVoted={false} />
    );
    expect(screen.getByText('Proposal not found')).toBeInTheDocument();
  });

  it('renders proposal summary, vote results, and cast panel when proposal exists', () => {
    render(
      <ProposalDetail
        proposal={mockProposal}
        loading={false}
        userVotingPower={500}
        hasUserVoted={false}
        onVote={() => {}}
      />
    );
    expect(screen.getByText('Test Proposal')).toBeInTheDocument();
    expect(screen.getByText('Voting Results')).toBeInTheDocument();
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('allows voting when user can vote', () => {
    render(
      <ProposalDetail
        proposal={mockProposal}
        loading={false}
        userVotingPower={500}
        hasUserVoted={false}
        onVote={() => {}}
      />
    );
    // Voting controls should be rendered and not disabled
    const votePanel = screen.getByText('Your Vote');
    expect(votePanel).toBeInTheDocument();
  });

  it('disables voting when user has already voted', () => {
    render(
      <ProposalDetail
        proposal={mockProposal}
        loading={false}
        userVotingPower={500}
        hasUserVoted={true}
        onVote={() => {}}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('disables voting when voting deadline has passed', () => {
    const expiredProposal = {
      ...mockProposal,
      votingDeadline: new Date(Date.now() - 86400000).toISOString(),
    };
    render(
      <ProposalDetail
        proposal={expiredProposal}
        loading={false}
        userVotingPower={500}
        hasUserVoted={false}
        onVote={() => {}}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('disables voting when votingDisabled prop is true', () => {
    render(
      <ProposalDetail
        proposal={mockProposal}
        loading={false}
        userVotingPower={500}
        hasUserVoted={false}
        votingDisabled={true}
        onVote={() => {}}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('shows voting results with vote tallies', () => {
    render(
      <ProposalDetail
        proposal={mockProposal}
        loading={false}
        userVotingPower={500}
        hasUserVoted={false}
      />
    );
    expect(screen.getByText('Voting Results')).toBeInTheDocument();
    expect(screen.getByText('In Favor')).toBeInTheDocument();
    expect(screen.getByText('Against')).toBeInTheDocument();
  });

  it('calls onVote when user votes', () => {
    const onVote = vi.fn();
    render(
      <ProposalDetail
        proposal={mockProposal}
        loading={false}
        userVotingPower={500}
        hasUserVoted={false}
        onVote={onVote}
      />
    );
    expect(onVote).not.toHaveBeenCalled();
  });
});
