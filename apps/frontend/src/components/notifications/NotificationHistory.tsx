'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useNotifications, TYPE_ICONS, TYPE_LABELS, NotificationType } from '@/hooks/useNotifications';
import { NotificationPreferences } from './NotificationPreferences';

const PAGE_SIZE = 15;

type FilterType = 'all' | NotificationType;

export function NotificationHistory() {
  const {
    visibleNotifications,
    unreadCount,
    markAsRead,
    markAsUnread,
    markAllRead,
  } = useNotifications();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [showPrefs, setShowPrefs] = useState(false);

  const filtered = visibleNotifications.filter((n) => {
    if (showUnreadOnly && n.isRead) return false;
    if (filter !== 'all' && n.type !== filter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const typeOptions: FilterType[] = [
    'all',
    ...([...new Set(visibleNotifications.map((n) => n.type))] as NotificationType[]),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {visibleNotifications.length} notification{visibleNotifications.length !== 1 ? 's' : ''}
            {unreadCount > 0 && ` · ${unreadCount} unread`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPrefs((s) => !s)}
            className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </button>
        </div>
      </div>

      {/* Preferences panel */}
      {showPrefs && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <NotificationPreferences />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Unread toggle */}
        <button
          type="button"
          onClick={() => { setShowUnreadOnly((v) => !v); setPage(1); }}
          className={`text-sm px-3 py-1 rounded-full border transition-colors ${
            showUnreadOnly
              ? 'bg-blue-600 text-white border-blue-600'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
          }`}
        >
          Unread only
        </button>

        {/* Type filter chips */}
        {typeOptions.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setFilter(t); setPage(1); }}
            className={`text-sm px-3 py-1 rounded-full border transition-colors ${
              filter === t
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-400'
            }`}
          >
            {t === 'all' ? 'All types' : `${TYPE_ICONS[t as NotificationType]} ${TYPE_LABELS[t as NotificationType]}`}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {paginated.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <svg className="mx-auto h-10 w-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="font-medium">No notifications</p>
          <p className="text-sm mt-1">
            {showUnreadOnly || filter !== 'all'
              ? 'Try adjusting your filters.'
              : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <ul
          className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
          aria-label="Notification history"
        >
          {paginated.map((n) => (
            <li
              key={n.id}
              className={`flex gap-3 px-4 py-4 group transition-colors ${
                !n.isRead
                  ? 'bg-blue-50 dark:bg-blue-900/10'
                  : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <span className="text-xl shrink-0 mt-0.5">{TYPE_ICONS[n.type]}</span>
              <div className="flex-1 min-w-0">
                {n.actionUrl ? (
                  <Link
                    href={n.actionUrl}
                    className="text-sm text-gray-800 dark:text-gray-200 leading-snug hover:underline"
                  >
                    {n.message}
                  </Link>
                ) : (
                  <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                    {n.message}
                  </p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    {TYPE_LABELS[n.type]}
                  </span>
                  {' · '}
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {!n.isRead && (
                  <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />
                )}
                {n.isRead ? (
                  <button
                    type="button"
                    onClick={() => markAsUnread([n.id])}
                    className="text-xs text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                  >
                    Mark unread
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => markAsRead([n.id])}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between" aria-label="Notification pages">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}
