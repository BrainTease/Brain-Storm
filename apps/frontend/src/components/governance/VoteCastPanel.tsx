'use client';

import { Card } from '@/components/ui/Card';
import { VotingControls } from '@/components/features/voting';

export interface VoteCastPanelProps {
  userVotingPower: number | null;
  hasUserVoted: boolean;
  userCanVote: boolean;
  votingDisabled?: boolean;
  onVote?: (support: boolean) => void;
  isExpired: boolean;
}

/** Panel for casting (or reviewing) the current user's vote on a proposal. */
export function VoteCastPanel({
  userVotingPower,
  hasUserVoted,
  userCanVote,
  votingDisabled,
  onVote,
  isExpired,
}: VoteCastPanelProps) {
  return (
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
  );
}
