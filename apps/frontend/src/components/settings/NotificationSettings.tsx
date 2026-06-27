'use client';

import { useNotifications, TYPE_LABELS, NotificationType } from '@/hooks/useNotifications';

const ORDER: NotificationType[] = [
  'enrollment',
  'progress',
  'credential',
  'token_reward',
  'course_update',
  'achievement',
  'message',
  'general',
];

export function NotificationSettings() {
  const { preferences, updatePreferences } = useNotifications();

  return (
    <section aria-labelledby="notifications-heading" className="space-y-6">
      <div>
        <h2 id="notifications-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification Preferences
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Choose which types of notifications you want to receive. These preferences sync to your account.
        </p>
      </div>

      <div className="space-y-3 max-w-md">
        {ORDER.map((type) => (
          <label
            key={type}
            className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {TYPE_LABELS[type]}
            </span>
            <input
              type="checkbox"
              checked={preferences[type]}
              onChange={(e) => updatePreferences({ [type]: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Changes take effect immediately. Some system notifications cannot be disabled.
      </p>
    </section>
  );
}
