'use client';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Proposal } from '@/store/governanceStore';
import { formatDateTime, formatTimeRemaining } from '@/lib/date-utils';

export interface ProposalSummaryProps {
  proposal: Proposal;
  votesTotal: number;
  isExpired: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

/** Proposal header: title, description, status, and key dates/vote totals. */
export function ProposalSummary({ proposal, votesTotal, isExpired }: ProposalSummaryProps) {
  return (
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
  );
}
