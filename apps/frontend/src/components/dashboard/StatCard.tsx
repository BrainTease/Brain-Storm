interface StatCardProps {
  label: string;
  value: string | number;
  /** Decorative emoji shown beside the value; hidden from assistive technology. */
  icon: string;
}

/** Single "big number + caption" tile. */
export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <span className="text-3xl" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}
