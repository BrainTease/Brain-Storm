'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Proposal } from '@/store/governanceStore';

export interface ProposalCardProps {
  proposal: Proposal;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  passed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export function ProposalCard({ proposal }: ProposalCardProps) {
  const votesTotal = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = votesTotal > 0 ? (proposal.votesFor / votesTotal) * 100 : 0;
  const againstPercentage = votesTotal > 0 ? (proposal.votesAgainst / votesTotal) * 100 : 0;
  const quorumReached = votesTotal >= proposal.quorumRequired;
  const timeRemaining = new Date(proposal.votingDeadline).getTime() - Date.now();
  const isExpired = timeRemaining <= 0;

  const formatTimeRemaining = () => {
    if (isExpired) return 'Voting ended';
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <Link href={`/governance/proposals/${proposal.id}`}>
      <Card className="flex flex-col gap-4 hover:shadow-lg transition-shadow cursor-pointer h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 line-clamp-2">
            {proposal.title}
          </h3>
          <Badge className={STATUS_COLORS[proposal.status]} variant="secondary">
            {proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
          </Badge>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {proposal.description}
        </p>

        {/* Voting Info */}
        <div className="space-y-3 flex-1">
          {/* For vs Against */}
          <div className="flex gap-2">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                For: {proposal.votesFor}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${forPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={proposal.votesFor}
                  aria-valuemin={0}
                  aria-valuemax={votesTotal || 1}
                  aria-label={`Votes for: ${proposal.votesFor}`}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Against: {proposal.votesAgainst}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{ width: `${againstPercentage}%` }}
                  role="progressbar"
                  aria-valuenow={proposal.votesAgainst}
                  aria-valuemin={0}
                  aria-valuemax={votesTotal || 1}
                  aria-label={`Votes against: ${proposal.votesAgainst}`}
                />
              </div>
            </div>
          </div>

          {/* Quorum Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">
              Quorum: {votesTotal} / {proposal.quorumRequired}
            </span>
            <span
              className={`font-semibold ${quorumReached ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}
            >
              {quorumReached ? '✓ Reached' : 'Pending'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span className="text-xs text-gray-500 dark:text-gray-500">
            {formatTimeRemaining()}
          </span>
          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
            View Details →
          </span>
        </div>
      </Card>
    </Link>
  );
}
