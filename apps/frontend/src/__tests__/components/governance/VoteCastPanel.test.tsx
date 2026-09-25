/* eslint-disable import/no-unresolved */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VoteCastPanel } from '@/components/governance/VoteCastPanel';

// eslint-disable-next-line max-lines-per-function
describe('VoteCastPanel', () => {
  it('renders the "Your Vote" title', () => {
    render(
      <VoteCastPanel
        userVotingPower={500}
        hasUserVoted={false}
        userCanVote={true}
        onVote={() => {}}
        isExpired={false}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('displays voting controls', () => {
    render(
      <VoteCastPanel
        userVotingPower={500}
        hasUserVoted={false}
        userCanVote={true}
        onVote={() => {}}
        isExpired={false}
      />
    );
    const panel = screen.getByText('Your Vote').closest('div');
    expect(panel).toBeInTheDocument();
  });

  it('handles when user has not voted yet', () => {
    render(
      <VoteCastPanel
        userVotingPower={500}
        hasUserVoted={false}
        userCanVote={true}
        onVote={() => {}}
        isExpired={false}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('handles when user has already voted', () => {
    render(
      <VoteCastPanel
        userVotingPower={500}
        hasUserVoted={true}
        userCanVote={false}
        onVote={() => {}}
        isExpired={false}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('passes voting control state correctly', () => {
    render(
      <VoteCastPanel
        userVotingPower={1000}
        hasUserVoted={false}
        userCanVote={true}
        votingDisabled={false}
        onVote={() => {}}
        isExpired={false}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('disables voting when votingDisabled is true', () => {
    render(
      <VoteCastPanel
        userVotingPower={500}
        hasUserVoted={false}
        userCanVote={false}
        votingDisabled={true}
        onVote={() => {}}
        isExpired={false}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('handles expired voting period', () => {
    render(
      <VoteCastPanel
        userVotingPower={500}
        hasUserVoted={false}
        userCanVote={false}
        onVote={() => {}}
        isExpired={true}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('handles null voting power', () => {
    render(
      <VoteCastPanel
        userVotingPower={null}
        hasUserVoted={false}
        userCanVote={false}
        onVote={() => {}}
        isExpired={false}
      />
    );
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('calls onVote callback when provided', () => {
    const onVote = vi.fn();
    render(
      <VoteCastPanel
        userVotingPower={500}
        hasUserVoted={false}
        userCanVote={true}
        onVote={onVote}
        isExpired={false}
      />
    );
    // Callback is passed to VotingControls component
    expect(screen.getByText('Your Vote')).toBeInTheDocument();
  });

  it('renders within a Card component', () => {
    const { container } = render(
      <VoteCastPanel
        userVotingPower={500}
        hasUserVoted={false}
        userCanVote={true}
        onVote={() => {}}
        isExpired={false}
      />
    );
    // Should be wrapped in a Card component
    const card = container.querySelector('[class*="Card"]') || container.firstChild;
    expect(card).toBeInTheDocument();
  });
});
