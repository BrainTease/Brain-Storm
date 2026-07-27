'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCohorts } from '@/hooks/useCohorts';
import { useDateFormatter } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { CohortForm, type CohortFormValues } from '@/components/cohorts/CohortForm';

export default function CohortsPage() {
  const t = useTranslations('cohorts');
  const { cohorts, create } = useCohorts();
  const dateFmt = useDateFormatter();
  const [creating, setCreating] = useState(false);

  const onCreate = (values: CohortFormValues) => {
    create(values);
    setCreating(false);
  };

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">{t('subtitle')}</p>
        </div>
        {!creating && <Button onClick={() => setCreating(true)}>{t('newCohort')}</Button>}
      </header>

      {creating && (
        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 bg-white dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('form.title')}
          </h2>
          <CohortForm onSubmit={onCreate} onCancel={() => setCreating(false)} />
        </section>
      )}

      {cohorts.length === 0 ? (
        <p className="text-center py-16 text-gray-500 dark:text-gray-400">{t('empty')}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {cohorts.map((c) => (
            <li
              key={c.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow"
            >
              <Link href={`/cohorts/${c.id}`} className="block space-y-2">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{c.name}</h3>
                {c.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {c.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>{t('membersCount', { count: c.members.length })}</span>
                  <span>·</span>
                  <span>{t('coursesCount', { count: c.courses.length })}</span>
                  <span>·</span>
                  <span>{t('progressLabel', { value: c.analytics.avgProgress })}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  {t('created', { date: dateFmt.short(c.createdAt) })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
