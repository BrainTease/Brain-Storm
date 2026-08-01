'use client';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Proposal } from '@/store/governanceStore';
import { formatDateTime, formatTimeRemaining } from '@/lib/date-utils';
import { VotingProgressBar, QuorumStatus, VotingControls } from '@/components/features/voting';

export interface ProposalDetailProps {
  proposal: Proposal | null;
  loading?: boolean;
  userVotingPower: number | null;
  hasUserVoted: boolean;
  onVote?: (support: boolean) => void;
  votingDisabled?: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

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

  const votesTotal = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = votesTotal > 0 ? (proposal.votesFor / votesTotal) * 100 : 0;
  const againstPercentage = votesTotal > 0 ? (proposal.votesAgainst / votesTotal) * 100 : 0;
  const quorumReached = votesTotal >= proposal.quorumRequired;
  const timeRemaining = new Date(proposal.votingDeadline).getTime() - Date.now();
  const isExpired = timeRemaining <= 0;
  const isActive = proposal.status === 'active' && !isExpired;
  const userCanVote = isActive && userVotingPower && userVotingPower > 0 && !hasUserVoted;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {proposal.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{proposal.description}</p>
          </div>
          <Badge className={STATUS_COLORS[proposal.status]} variant="secondary">
            {proposal.status.toUpperCase()}
          </Badge>
        </div>

        {/* Meta Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Created
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatDateTime(proposal.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Deadline
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatDateTime(proposal.votingDeadline)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Time Remaining
            </p>
            <p
              className={`text-sm font-semibold ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
            >
              {isExpired ? 'Voting has ended' : formatTimeRemaining(proposal.votingDeadline)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Total Votes
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {votesTotal.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Voting Results */}
        <Card className="md:col-span-2 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Voting Results
          </h2>

          <div className="mb-6">
            <VotingProgressBar
              label="In Favor"
              votes={proposal.votesFor}
              percentage={forPercentage}
              color="green"
              total={votesTotal || 1}
            />
          </div>

          <div className="mb-8">
            <VotingProgressBar
              label="Against"
              votes={proposal.votesAgainst}
              percentage={againstPercentage}
              color="red"
              total={votesTotal || 1}
            />
          </div>

          <QuorumStatus totalVotes={votesTotal} quorumRequired={proposal.quorumRequired} />
        </Card>

        {/* User Voting Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Your Vote</h2>

          <VotingControls
            userVotingPower={userVotingPower}
            hasUserVoted={hasUserVoted}
            userCanVote={userCanVote}
            votingDisabled={votingDisabled}
            onVote={onVote}
            isExpired={isExpired}
          />
        </Card>
      </div>
    </div>
  );
}
