'use client';

import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Proposal } from '@/store/governanceStore';
import { calculateVoteTally } from '@/lib/governance-tally';
import { ProposalSummary } from './ProposalSummary';
import { VoteResults } from './VoteResults';
import { VoteCastPanel } from './VoteCastPanel';

export interface ProposalDetailProps {
  proposal: Proposal | null;
  loading?: boolean;
  userVotingPower: number | null;
  hasUserVoted: boolean;
  onVote?: (support: boolean) => void;
  votingDisabled?: boolean;
}

export function ProposalDetail({
  proposal,
  loading,
  userVotingPower,
  hasUserVoted,
  onVote,
  votingDisabled,
}: ProposalDetailProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading proposal…" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Proposal not found</p>
      </Card>
    );
  }

  const tally = calculateVoteTally(
    proposal.votesFor,
    proposal.votesAgainst,
    proposal.quorumRequired
  );
  const timeRemaining = new Date(proposal.votingDeadline).getTime() - Date.now();
  const isExpired = timeRemaining <= 0;
  const isActive = proposal.status === 'active' && !isExpired;
  const userCanVote = isActive && userVotingPower !== null && userVotingPower > 0 && !hasUserVoted;

  return (
    <div className="space-y-6">
      <ProposalSummary proposal={proposal} votesTotal={tally.votesTotal} isExpired={isExpired} />

      <div className="grid md:grid-cols-3 gap-6">
        <VoteResults
          votesFor={proposal.votesFor}
          votesAgainst={proposal.votesAgainst}
          quorumRequired={proposal.quorumRequired}
          tally={tally}
        />

        <VoteCastPanel
          userVotingPower={userVotingPower}
          hasUserVoted={hasUserVoted}
          userCanVote={userCanVote}
          votingDisabled={votingDisabled}
          onVote={onVote}
          isExpired={isExpired}
        />
      </div>
    </div>
  );
}
