'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { useLeaderboard, type LeaderboardPeriod } from '@/hooks/useLeaderboard';
import { useDateFormatter, useNumberFormatter } from '@/lib/format';

const PERIODS: LeaderboardPeriod[] = ['week', 'month', 'all'];
const PAGE_SIZE = 10;

export default function LeaderboardPage() {
  const t = useTranslations('leaderboard');
  const { user } = useAuth();
  const dateFmt = useDateFormatter();
  const numberFmt = useNumberFormatter();

  const [period, setPeriod] = useState<LeaderboardPeriod>('week');
  const [page, setPage] = useState(1);

  const data = useLeaderboard({ period, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const startRank = (page - 1) * PAGE_SIZE;

  const updated = useMemo(() => dateFmt.long(data.updatedAt), [dateFmt, data.updatedAt]);

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {t('updated', { date: updated })}
        </p>
      </header>

      <div
        role="tablist"
        aria-label={t('title')}
        className="inline-flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
      >
        {PERIODS.map((p) => (
          <button
            key={p}
            role="tab"
            type="button"
            aria-selected={period === p}
            onClick={() => {
              setPeriod(p);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t(`periods.${p}`)}
          </button>
        ))}
      </div>

      {data.entries.length === 0 ? (
        <p className="text-center py-16 text-gray-500 dark:text-gray-400">{t('empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {t('rank')}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {t('learner')}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {t('points')}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-end text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {t('courses')}
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
                >
                  {t('badges')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {data.entries.map((e, i) => {
                const rank = startRank + i + 1;
                const isCurrent = !!user && user.id === e.userId;
                return (
                  <tr
                    key={e.userId}
                    className={
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-950/40'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                      <RankBadge rank={rank} />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.username} url={e.avatarUrl} />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {e.username}
                            {isCurrent && (
                              <span className="ms-2 inline-block rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                                {t('you')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-end tabular-nums text-gray-900 dark:text-gray-100">
                      {t('pointsValue', { value: e.points })}
                    </td>
                    <td className="px-4 py-3 text-sm text-end tabular-nums text-gray-700 dark:text-gray-300">
                      {numberFmt.decimal(e.coursesCompleted)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {e.badges.map((b) => (
                          <span
                            key={b}
                            title={b}
                            className="inline-block rounded bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300"
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <nav
        aria-label="Pagination"
        className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
      >
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {t('previous')}
        </button>
        <span>{t('page', { page, total: totalPages })}</span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {t('next')}
        </button>
      </nav>
    </main>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span aria-label="Rank 1" className="text-yellow-500 text-lg">
        🥇
      </span>
    );
  if (rank === 2)
    return (
      <span aria-label="Rank 2" className="text-gray-400 text-lg">
        🥈
      </span>
    );
  if (rank === 3)
    return (
      <span aria-label="Rank 3" className="text-amber-700 text-lg">
        🥉
      </span>
    );
  return <span className="tabular-nums">{rank}</span>;
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name}
        className="w-8 h-8 rounded-full object-cover bg-gray-200 dark:bg-gray-700"
      />
    );
  }
  const initial = name.slice(0, 1).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center text-sm font-semibold"
    >
      {initial}
    </span>
  );
}
