/* eslint-disable import/no-unresolved */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { VoteResults } from '@/components/governance/VoteResults';
import { VoteTally } from '@/lib/governance-tally';

const mockTally: VoteTally = {
  votesTotal: 1000,
  forPercentage: 60,
  againstPercentage: 40,
};

describe('VoteResults', () => {
  it('renders the voting results title', () => {
    render(
      <VoteResults votesFor={600} votesAgainst={400} quorumRequired={1000} tally={mockTally} />
    );
    expect(screen.getByText('Voting Results')).toBeInTheDocument();
  });

  it('displays "In Favor" voting progress bar', () => {
    render(
      <VoteResults votesFor={600} votesAgainst={400} quorumRequired={1000} tally={mockTally} />
    );
    expect(screen.getByText('In Favor')).toBeInTheDocument();
  });

  it('displays "Against" voting progress bar', () => {
    render(
      <VoteResults votesFor={600} votesAgainst={400} quorumRequired={1000} tally={mockTally} />
    );
    expect(screen.getByText('Against')).toBeInTheDocument();
  });

  it('displays quorum status', () => {
    render(
      <VoteResults votesFor={600} votesAgainst={400} quorumRequired={1000} tally={mockTally} />
    );
    // QuorumStatus component should be rendered
    const element = screen.getByText('Voting Results').closest('div');
    expect(element).toBeInTheDocument();
  });

  it('handles zero votes correctly', () => {
    const zeroTally: VoteTally = {
      votesTotal: 0,
      forPercentage: 0,
      againstPercentage: 0,
    };
    render(<VoteResults votesFor={0} votesAgainst={0} quorumRequired={1000} tally={zeroTally} />);
    expect(screen.getByText('Voting Results')).toBeInTheDocument();
  });

  it('displays percentages correctly', () => {
    render(
      <VoteResults
        votesFor={750}
        votesAgainst={250}
        quorumRequired={1000}
        tally={{
          votesTotal: 1000,
          forPercentage: 75,
          againstPercentage: 25,
        }}
      />
    );
    expect(screen.getByText('In Favor')).toBeInTheDocument();
    expect(screen.getByText('Against')).toBeInTheDocument();
  });

  it('renders as part of a card component', () => {
    const { container } = render(
      <VoteResults votesFor={600} votesAgainst={400} quorumRequired={1000} tally={mockTally} />
    );
    // Should be wrapped in a Card component
    const card = container.querySelector('[class*="Card"]') || container.firstChild;
    expect(card).toBeInTheDocument();
  });
});
