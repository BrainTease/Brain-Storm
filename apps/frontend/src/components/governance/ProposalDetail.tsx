'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Proposal } from '@/store/governanceStore';

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
  const [votingInProgress, setVotingInProgress] = useState(false);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeRemaining = () => {
    if (isExpired) return 'Voting has ended';
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const handleVote = async (support: boolean) => {
    setVotingInProgress(true);
    try {
      await onVote?.(support);
    } finally {
      setVotingInProgress(false);
    }
  };

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
              {formatDate(proposal.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Deadline
            </p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {formatDate(proposal.votingDeadline)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-500 uppercase tracking-wide">
              Time Remaining
            </p>
            <p
              className={`text-sm font-semibold ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
            >
              {formatTimeRemaining()}
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

          {/* For Votes */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                In Favor
              </span>
              <span className="text-sm font-bold text-green-600 dark:text-green-400">
                {proposal.votesFor.toLocaleString()} ({forPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-500 h-3 transition-all duration-300"
                style={{ width: `${forPercentage}%` }}
                role="progressbar"
                aria-valuenow={proposal.votesFor}
                aria-valuemin={0}
                aria-valuemax={votesTotal || 1}
                aria-label={`Votes in favor: ${proposal.votesFor}`}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Against
              </span>
              <span className="text-sm font-bold text-red-600 dark:text-red-400">
                {proposal.votesAgainst.toLocaleString()} ({againstPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-red-500 h-3 transition-all duration-300"
                style={{ width: `${againstPercentage}%` }}
                role="progressbar"
                aria-valuenow={proposal.votesAgainst}
                aria-valuemin={0}
                aria-valuemax={votesTotal || 1}
                aria-label={`Votes against: ${proposal.votesAgainst}`}
              />
            </div>
          </div>

          {/* Quorum Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Quorum Status
              </span>
              <span
                className={`text-sm font-bold ${quorumReached ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}
              >
                {quorumReached ? '✓ Reached' : 'Not Reached'}
              </span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>{votesTotal} votes cast</span>
              <span>{proposal.quorumRequired} required</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 transition-all duration-300 ${quorumReached ? 'bg-green-500' : 'bg-orange-500'}`}
                style={{ width: `${Math.min((votesTotal / proposal.quorumRequired) * 100, 100)}%` }}
                role="progressbar"
                aria-valuenow={votesTotal}
                aria-valuemin={0}
                aria-valuemax={proposal.quorumRequired}
                aria-label={`Quorum: ${votesTotal} of ${proposal.quorumRequired} required`}
              />
            </div>
          </div>
        </Card>

        {/* User Voting Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Your Vote
          </h2>

          {userVotingPower === null ? (
            <div className="text-center text-gray-600 dark:text-gray-400">
              <p className="text-sm mb-4">Connect wallet to vote</p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Your Voting Power
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {userVotingPower.toLocaleString()}
                </p>
              </div>

              {hasUserVoted && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-6">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                    ✓ You have voted on this proposal
                  </p>
                </div>
              )}

              {userCanVote && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleVote(true)}
                    disabled={votingInProgress || votingDisabled}
                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    aria-label="Vote in favor"
                  >
                    {votingInProgress ? <Spinner size="sm" /> : null}
                    Vote For
                  </button>
                  <button
                    onClick={() => handleVote(false)}
                    disabled={votingInProgress || votingDisabled}
                    className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    aria-label="Vote against"
                  >
                    {votingInProgress ? <Spinner size="sm" /> : null}
                    Vote Against
                  </button>
                </div>
              )}

              {!userCanVote && !hasUserVoted && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-700 dark:text-yellow-400">
                    {isExpired ? 'Voting has ended' : 'Voting is not available'}
                  </p>
                </div>
              )}
            </>
          )}

          {votingDisabled && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">
                Signing transaction…
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
