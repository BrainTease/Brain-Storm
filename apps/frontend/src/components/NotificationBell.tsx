'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useNotifications, TYPE_ICONS } from '@/hooks/useNotifications';

export function NotificationBell() {
  const { visibleNotifications, unreadCount, markAsRead, markAsUnread, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Show only the 10 most recent in the dropdown
  const preview = visibleNotifications.slice(0, 10);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative p-1 rounded-full text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <ul
            className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800"
            role="list"
            aria-label="Recent notifications"
          >
            {preview.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                No notifications yet
              </li>
            ) : (
              preview.map((n) => (
                <li
                  key={n.id}
                  className={`flex gap-3 px-4 py-3 transition-colors group ${
                    !n.isRead ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span className="text-lg shrink-0 mt-0.5">{TYPE_ICONS[n.type]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {!n.isRead ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        <button
                          type="button"
                          onClick={() => markAsRead([n.id])}
                          title="Mark as read"
                          className="text-[10px] text-blue-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          Read
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markAsUnread([n.id])}
                        title="Mark as unread"
                        className="text-[10px] text-gray-400 hover:text-blue-500 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Unread
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all notifications →
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:underline"
            >
              Preferences
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
