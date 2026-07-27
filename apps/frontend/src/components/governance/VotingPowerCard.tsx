'use client';

import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

export interface VotingPowerCardProps {
  votingPower: number | null;
  loading?: boolean;
  walletAddress?: string | null;
}

export function VotingPowerCard({
  votingPower,
  loading,
  walletAddress,
}: VotingPowerCardProps) {
  if (!walletAddress) {
    return (
      <Card className="p-6 bg-gray-50 dark:bg-gray-900/50">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Connect your wallet to view voting power
        </p>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="p-6 flex items-center justify-center">
        <Spinner size="sm" label="Loading voting power…" />
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
      <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
        Your Voting Power
      </p>
      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
        {votingPower !== null ? votingPower.toLocaleString() : '0'}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
        Based on your token balance on-chain
      </p>
    </Card>
  );
}
