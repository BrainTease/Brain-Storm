'use client';

export interface QuorumStatusProps {
  totalVotes: number;
  quorumRequired: number;
}

export function QuorumStatus({ totalVotes, quorumRequired }: QuorumStatusProps) {
  const quorumReached = totalVotes >= quorumRequired;
  const quorumPercentage = Math.min((totalVotes / quorumRequired) * 100, 100);

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quorum Status</span>
        <span
          className={`text-sm font-bold ${quorumReached ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}
        >
          {quorumReached ? '✓ Reached' : 'Not Reached'}
        </span>
      </div>
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
        <span>{totalVotes} votes cast</span>
        <span>{quorumRequired} required</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 transition-all duration-300 ${quorumReached ? 'bg-green-500' : 'bg-orange-500'}`}
          style={{ width: `${quorumPercentage}%` }}
          role="progressbar"
          aria-valuenow={totalVotes}
          aria-valuemin={0}
          aria-valuemax={quorumRequired}
          aria-label={`Quorum: ${totalVotes} of ${quorumRequired} required`}
        />
      </div>
    </div>
  );
}
