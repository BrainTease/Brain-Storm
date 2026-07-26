import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VotingControls } from '@/components/features/voting/VotingControls';

describe('VotingControls', () => {
  it('shows connection prompt when voting power is null', () => {
    render(
      <VotingControls
        userVotingPower={null}
        hasUserVoted={false}
        userCanVote={false}
        isExpired={false}
      />
    );
    expect(screen.getByText('Connect wallet to vote')).toBeInTheDocument();
  });

  it('displays voting power when connected', () => {
    render(
      <VotingControls
        userVotingPower={1000}
        hasUserVoted={false}
        userCanVote={true}
        isExpired={false}
      />
    );
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('shows voted status when user has already voted', () => {
    render(
      <VotingControls
        userVotingPower={1000}
        hasUserVoted={true}
        userCanVote={false}
        isExpired={false}
      />
    );
    expect(screen.getByText('✓ You have voted on this proposal')).toBeInTheDocument();
  });

  it('shows voting buttons when user can vote', () => {
    render(
      <VotingControls
        userVotingPower={1000}
        hasUserVoted={false}
        userCanVote={true}
        isExpired={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Vote in favor' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vote against' })).toBeInTheDocument();
  });

  it('calls onVote when voting for', async () => {
    const onVote = vi.fn();
    const user = userEvent.setup();
    render(
      <VotingControls
        userVotingPower={1000}
        hasUserVoted={false}
        userCanVote={true}
        isExpired={false}
        onVote={onVote}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Vote in favor' }));
    await waitFor(() => {
      expect(onVote).toHaveBeenCalledWith(true);
    });
  });

  it('calls onVote when voting against', async () => {
    const onVote = vi.fn();
    const user = userEvent.setup();
    render(
      <VotingControls
        userVotingPower={1000}
        hasUserVoted={false}
        userCanVote={true}
        isExpired={false}
        onVote={onVote}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Vote against' }));
    await waitFor(() => {
      expect(onVote).toHaveBeenCalledWith(false);
    });
  });

  it('disables voting buttons when voting is disabled', () => {
    render(
      <VotingControls
        userVotingPower={1000}
        hasUserVoted={false}
        userCanVote={true}
        votingDisabled={true}
        isExpired={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Vote in favor' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Vote against' })).toBeDisabled();
  });

  it('shows expired message when voting is expired', () => {
    render(
      <VotingControls
        userVotingPower={1000}
        hasUserVoted={false}
        userCanVote={false}
        isExpired={true}
      />
    );
    expect(screen.getByText('Voting has ended')).toBeInTheDocument();
  });

  it('shows signing transaction message when voting is disabled', () => {
    render(
      <VotingControls
        userVotingPower={1000}
        hasUserVoted={false}
        userCanVote={true}
        votingDisabled={true}
        isExpired={false}
      />
    );
    expect(screen.getByText('Signing transaction…')).toBeInTheDocument();
  });
});
