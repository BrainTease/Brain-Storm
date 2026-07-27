'use client';

import { useState, use } from 'react';
import { useTranslations } from 'next-intl';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { useCohort, useCohorts, type CohortRole } from '@/hooks/useCohorts';
import { useAuth } from '@/hooks/useAuth';
import { useDateFormatter, useNumberFormatter } from '@/lib/format';
import { Button } from '@/components/ui/Button';

type Tab = 'overview' | 'members' | 'discussion' | 'courses' | 'analytics';
const TABS: Tab[] = ['overview', 'members', 'discussion', 'courses', 'analytics'];

export default function CohortDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('cohorts');
  const cohort = useCohort(id);
  const [tab, setTab] = useState<Tab>('overview');

  if (!cohort) return notFound();

  return (
    <main className="max-w-5xl mx-auto p-8 space-y-6">
      <header className="space-y-1">
        <Link href="/cohorts" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← {t('title')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{cohort.name}</h1>
        {cohort.description && (
          <p className="text-gray-600 dark:text-gray-400">{cohort.description}</p>
        )}
      </header>

      <div
        role="tablist"
        aria-label={cohort.name}
        className="border-b border-gray-200 dark:border-gray-700 flex gap-4"
      >
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === key
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t(`tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview cohortId={cohort.id} />}
      {tab === 'members' && <Members cohortId={cohort.id} />}
      {tab === 'discussion' && <Discussion cohortId={cohort.id} />}
      {tab === 'courses' && <Courses cohortId={cohort.id} />}
      {tab === 'analytics' && <Analytics cohortId={cohort.id} />}
    </main>
  );
}

function Overview({ cohortId }: { cohortId: string }) {
  const t = useTranslations('cohorts');
  const cohort = useCohort(cohortId)!;
  const dateFmt = useDateFormatter();
  const numFmt = useNumberFormatter();

  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Stat
        label={t('analytics.activeMembers')}
        value={numFmt.decimal(cohort.analytics.activeMembers)}
      />
      <Stat
        label={t('analytics.avgProgress')}
        value={numFmt.percent(cohort.analytics.avgProgress)}
      />
      <Stat
        label={t('analytics.completionRate')}
        value={numFmt.percent(cohort.analytics.completionRate)}
      />
      <Stat
        label={t('analytics.totalPoints')}
        value={numFmt.compact(cohort.analytics.totalPoints)}
      />
      <div className="md:col-span-2 text-sm text-gray-500 dark:text-gray-400">
        {t('created', { date: dateFmt.long(cohort.createdAt) })}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white tabular-nums mt-1">
        {value}
      </div>
    </div>
  );
}

function Members({ cohortId }: { cohortId: string }) {
  const t = useTranslations('cohorts.members');
  const cohort = useCohort(cohortId)!;
  const { addMember, removeMember } = useCohorts();
  const dateFmt = useDateFormatter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CohortRole>('student');

  const handleAdd = () => {
    if (!email.trim()) return;
    addMember(cohortId, { email: email.trim(), name: email.split('@')[0], role });
    setEmail('');
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          className="flex-1 min-w-[240px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as CohortRole)}
          aria-label={t('role')}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
        >
          <option value="student">{t('roles.student')}</option>
          <option value="ta">{t('roles.ta')}</option>
          <option value="instructor">{t('roles.instructor')}</option>
        </select>
        <Button onClick={handleAdd}>{t('addMember')}</Button>
      </div>

      {cohort.members.length === 0 ? (
        <p className="text-center py-10 text-gray-500 dark:text-gray-400">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {cohort.members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-900"
            >
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{m.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {m.email} · {t(`roles.${m.role}`)} ·{' '}
                  {t('joined', { date: dateFmt.short(m.joinedAt) })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeMember(cohortId, m.id)}
                className="text-sm text-red-600 hover:underline"
              >
                {t('remove')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Discussion({ cohortId }: { cohortId: string }) {
  const t = useTranslations('cohorts.discussion');
  const cohort = useCohort(cohortId)!;
  const { postMessage } = useCohorts();
  const { user } = useAuth();
  const dateFmt = useDateFormatter();
  const [body, setBody] = useState('');

  const handlePost = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    postMessage(cohortId, user?.username ?? 'Anonymous', trimmed);
    setBody('');
  };

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('placeholder')}
          rows={3}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
        />
        <div className="flex justify-end">
          <Button onClick={handlePost} disabled={!body.trim()}>
            {t('post')}
          </Button>
        </div>
      </div>

      {cohort.messages.length === 0 ? (
        <p className="text-center py-10 text-gray-500 dark:text-gray-400">{t('empty')}</p>
      ) : (
        <ul className="space-y-2">
          {cohort.messages.map((m) => (
            <li
              key={m.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {m.author}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {dateFmt.relative(m.postedAt)}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {m.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Courses({ cohortId }: { cohortId: string }) {
  const t = useTranslations('cohorts.courses');
  const cohort = useCohort(cohortId)!;
  const { assignCourse } = useCohorts();
  const dateFmt = useDateFormatter();
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');

  const handleAssign = () => {
    if (!title.trim() || !dueAt) return;
    assignCourse(cohortId, { title: title.trim(), dueAt });
    setTitle('');
    setDueAt('');
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('assignedTitle')}</h2>

      <div className="flex flex-wrap items-end gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Course title"
          className="flex-1 min-w-[200px] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
        />
        <input
          type="date"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800"
        />
        <Button onClick={handleAssign}>{t('assign')}</Button>
      </div>

      {cohort.courses.length === 0 ? (
        <p className="text-center py-10 text-gray-500 dark:text-gray-400">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {cohort.courses.map((c) => (
            <li
              key={c.id}
              className="px-4 py-3 bg-white dark:bg-gray-900 flex items-center justify-between gap-2"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">{c.title}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('due', { date: dateFmt.short(c.dueAt) })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Analytics({ cohortId }: { cohortId: string }) {
  const t = useTranslations('cohorts.analytics');
  const cohort = useCohort(cohortId)!;
  const numFmt = useNumberFormatter();
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <Stat label={t('activeMembers')} value={numFmt.decimal(cohort.analytics.activeMembers)} />
      <Stat label={t('avgProgress')} value={numFmt.percent(cohort.analytics.avgProgress)} />
      <Stat label={t('completionRate')} value={numFmt.percent(cohort.analytics.completionRate)} />
      <Stat label={t('totalPoints')} value={numFmt.compact(cohort.analytics.totalPoints)} />
    </section>
  );
}
