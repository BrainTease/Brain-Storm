import type { Metadata } from 'next';
import { NotificationHistory } from '@/components/notifications/NotificationHistory';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'View your full notification history and manage preferences.',
};

export default function NotificationsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <NotificationHistory />
    </main>
  );
}
