import { SkeletonBlock } from './SkeletonBlock';

interface TokenBalanceCardProps {
  balance: number | null;
  isLoading?: boolean;
}

/** BST token balance, shown as its own titled section. */
export function TokenBalanceCard({ balance, isLoading = false }: TokenBalanceCardProps) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">BST Token Balance</h2>
      <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        {isLoading ? (
          <SkeletonBlock className="h-7 w-32" />
        ) : (
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">
            {balance ?? 0} BST
          </p>
        )}
      </div>
    </section>
  );
}
