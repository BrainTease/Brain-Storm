import type { DashboardStats } from '@/lib/dashboard';
import { SkeletonBlock } from './SkeletonBlock';
import { StatCard } from './StatCard';

interface QuickStatsProps {
  stats: DashboardStats;
  tokenBalance: number | null;
  isLoading?: boolean;
}

/** Four-up summary row: completed, in progress, hours studied and token balance. */
export function QuickStats({ stats, tokenBalance, isLoading = false }: QuickStatsProps) {
  return (
    <section aria-label="Quick stats">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-20" />)
        ) : (
          <>
            <StatCard label="Courses Completed" value={stats.completed} icon="🏆" />
            <StatCard label="In Progress" value={stats.inProgress} icon="📚" />
            <StatCard label="Total Hours" value={`${stats.totalHours}h`} icon="⏱" />
            <StatCard label="BST Tokens" value={tokenBalance ?? 0} icon="🪙" />
          </>
        )}
      </div>
    </section>
  );
}
