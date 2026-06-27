'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';

interface NotificationPrefs {
  emailCourseUpdates: boolean;
  emailNewMessages: boolean;
  emailCertificates: boolean;
  emailWeeklyDigest: boolean;
  pushCourseReminders: boolean;
  pushAchievements: boolean;
}

interface Props {
  userId: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  emailCourseUpdates: true,
  emailNewMessages: true,
  emailCertificates: true,
  emailWeeklyDigest: false,
  pushCourseReminders: true,
  pushAchievements: true,
};

export default function NotificationPreferences({ userId }: Props) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .get<NotificationPrefs>(`/users/${userId}/notification-preferences`)
      .then((r) => setPrefs({ ...DEFAULT_PREFS, ...r.data }))
      .catch(() => {/* use defaults */});
  }, [userId]);

  const toggle = useCallback((key: keyof NotificationPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/users/${userId}/notification-preferences`, prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {/* silently fail */} finally {
      setSaving(false);
    }
  };

  const items: { key: keyof NotificationPrefs; label: string; description: string; group: 'Email' | 'Push' }[] = [
    { key: 'emailCourseUpdates',  label: 'Course Updates',    description: 'Instructor announcements and new lessons', group: 'Email' },
    { key: 'emailNewMessages',    label: 'New Messages',      description: 'Replies in course forums and direct messages', group: 'Email' },
    { key: 'emailCertificates',   label: 'Certificates',      description: 'When a new certificate is issued to you', group: 'Email' },
    { key: 'emailWeeklyDigest',   label: 'Weekly Digest',     description: 'A summary of your learning activity', group: 'Email' },
    { key: 'pushCourseReminders', label: 'Course Reminders',  description: 'Daily reminders to continue your courses', group: 'Push' },
    { key: 'pushAchievements',    label: 'Achievements',      description: 'When you unlock a badge or milestone', group: 'Push' },
  ];

  const emailItems = items.filter((i) => i.group === 'Email');
  const pushItems  = items.filter((i) => i.group === 'Push');

  return (
    <section
      aria-labelledby="notif-heading"
      className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-5 bg-white dark:bg-gray-900"
    >
      <h2 id="notif-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
        Notification Preferences
      </h2>

      {[{ label: '📧 Email Notifications', items: emailItems }, { label: '🔔 Push Notifications', items: pushItems }].map(
        (group) => (
          <div key={group.label} className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">{group.label}</h3>
            {group.items.map(({ key, label, description }) => (
              <label
                key={key}
                className="flex items-center justify-between gap-4 cursor-pointer group"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{description}</span>
                </span>
                {/* Toggle switch */}
                <span
                  role="switch"
                  aria-checked={prefs[key]}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && toggle(key)}
                  onClick={() => toggle(key)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                    ${prefs[key] ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5
                      ${prefs[key] ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </span>
              </label>
            ))}
          </div>
        )
      )}

      <Button onClick={handleSave} disabled={saving} variant="outline">
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Preferences'}
      </Button>
    </section>
  );
}
