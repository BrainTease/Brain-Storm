'use client';

export interface VotingProgressBarProps {
  label: string;
  votes: number;
  percentage: number;
  color: 'green' | 'red';
  total: number;
}

export function VotingProgressBar({
  label,
  votes,
  percentage,
  color,
  total,
}: VotingProgressBarProps) {
  const bgColor = color === 'green' ? 'bg-green-500' : 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className={`text-sm font-bold ${color === 'green' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {votes.toLocaleString()} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`${bgColor} h-3 transition-all duration-300`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={votes}
          aria-valuemin={0}
          aria-valuemax={total || 1}
          aria-label={`${label}: ${votes}`}
        />
      </div>
    </div>
  );
}
