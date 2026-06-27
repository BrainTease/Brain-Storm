'use client';

import { useNotifications, TYPE_ICONS, TYPE_LABELS, NotificationType } from '@/hooks/useNotifications';

const ALL_TYPES: NotificationType[] = [
  'enrollment',
  'progress',
  'credential',
  'token_reward',
  'course_update',
  'achievement',
  'message',
  'general',
];

export function NotificationPreferences() {
  const { preferences, updatePreferences } = useNotifications();

  return (
    <section aria-labelledby="notif-prefs-heading" className="space-y-4">
      <div>
        <h2
          id="notif-prefs-heading"
          className="text-lg font-semibold text-gray-900 dark:text-white"
        >
          Notification Preferences
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Choose which notification types you want to see. Preferences are saved locally.
        </p>
      </div>

      <ul className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {ALL_TYPES.map((type) => (
          <li
            key={type}
            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{TYPE_ICONS[type]}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {TYPE_LABELS[type]}
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences[type] !== false}
                onChange={(e) => updatePreferences({ [type]: e.target.checked })}
                aria-label={`Enable ${TYPE_LABELS[type]} notifications`}
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
