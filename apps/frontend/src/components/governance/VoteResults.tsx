'use client';

import { Card } from '@/components/ui/Card';
import { VotingProgressBar, QuorumStatus } from '@/components/features/voting';
import type { VoteTally } from '@/lib/governance-tally';

export interface VoteResultsProps {
  votesFor: number;
  votesAgainst: number;
  quorumRequired: number;
  tally: VoteTally;
}

/** Vote breakdown (for/against bars) and quorum progress for a proposal. */
export function VoteResults({ votesFor, votesAgainst, quorumRequired, tally }: VoteResultsProps) {
  const { votesTotal, forPercentage, againstPercentage } = tally;

  return (
    <Card className="md:col-span-2 p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Voting Results</h2>

      <div className="mb-6">
        <VotingProgressBar
          label="In Favor"
          votes={votesFor}
          percentage={forPercentage}
          color="green"
          total={votesTotal || 1}
        />
      </div>

      <div className="mb-8">
        <VotingProgressBar
          label="Against"
          votes={votesAgainst}
          percentage={againstPercentage}
          color="red"
          total={votesTotal || 1}
        />
      </div>

      <QuorumStatus totalVotes={votesTotal} quorumRequired={quorumRequired} />
    </Card>
  );
}
