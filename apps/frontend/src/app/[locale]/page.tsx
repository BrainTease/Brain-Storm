import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations('home');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">{t('title')}</h1>
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 text-center max-w-xl">
        {t('description')}
      </p>
      <div className="flex gap-4">
        <Link href="/courses" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          {t('browseCourses')}
        </Link>
        <Link href="/auth/register" className="px-6 py-3 border border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
          {t('getStarted')}
        </Link>
      </div>
    </main>
  );
}
