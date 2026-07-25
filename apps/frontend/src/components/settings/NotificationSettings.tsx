'use client';

import { useNotifications, TYPE_LABELS, NotificationType } from '@/hooks/useNotifications';
import { Checkbox } from '@/components/ui/form';

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
          <Checkbox
            key={type}
            id={`notification-${type}`}
            variant="row"
            label={TYPE_LABELS[type]}
            checked={preferences[type]}
            onChange={(e) => updatePreferences({ [type]: e.target.checked })}
          />
        ))}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Changes take effect immediately. Some system notifications cannot be disabled.
      </p>
    </section>
  );
}
