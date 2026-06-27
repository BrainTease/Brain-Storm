'use client';

import { useSearchParams } from 'next/navigation';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { AppearanceSettings } from '@/components/settings/AppearanceSettings';
import { PrivacySettings } from '@/components/settings/PrivacySettings';

const SECTIONS: Record<string, React.FC> = {
  account: AccountSettings,
  notifications: NotificationSettings,
  appearance: AppearanceSettings,
  privacy: PrivacySettings,
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const section = searchParams.get('section') || 'account';
  const Component = SECTIONS[section];

  if (!Component) {
    return <p className="text-gray-500 dark:text-gray-400">Settings section not found.</p>;
  }

  return <Component />;
}
