import type { Metadata } from 'next';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { NotificationPreferences } from '@/components/notifications/NotificationPreferences';

export const metadata: Metadata = {
  title: 'Settings',
  description: 'Manage your Brain-Storm preferences and account settings.',
};

export default function SettingsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10 space-y-12">
      <header>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your account preferences.
        </p>
      </header>

      {/* Appearance */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Appearance
        </h2>
        <AppearanceSettings />
      </section>

      <hr className="border-gray-200 dark:border-gray-700" />

      {/* Notifications */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Notifications
        </h2>
        <NotificationPreferences />
      </section>
    </main>
  );
}
