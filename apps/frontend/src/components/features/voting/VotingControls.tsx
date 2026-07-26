'use client';

import { useState } from 'react';
import { Spinner } from '@/components/ui/Spinner';

export interface VotingControlsProps {
  userVotingPower: number | null;
  hasUserVoted: boolean;
  userCanVote: boolean;
  votingDisabled?: boolean;
  onVote?: (support: boolean) => void;
  isExpired: boolean;
}

export function VotingControls({
  userVotingPower,
  hasUserVoted,
  userCanVote,
  votingDisabled,
  onVote,
  isExpired,
}: VotingControlsProps) {
  const [votingInProgress, setVotingInProgress] = useState(false);

  const handleVote = async (support: boolean) => {
    setVotingInProgress(true);
    try {
      await onVote?.(support);
    } finally {
      setVotingInProgress(false);
    }
  };

  if (userVotingPower === null) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400">
        <p className="text-sm mb-4">Connect wallet to vote</p>
      </div>
    );
  }

  return (
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

      {votingDisabled && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-700 dark:text-red-400">
            Signing transaction…
          </p>
        </div>
      )}
    </>
  );
}
