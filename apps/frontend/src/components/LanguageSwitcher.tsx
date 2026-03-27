'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

const LOCALES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
];

export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (next: string) => {
    // pathname is like /en/courses — replace the locale segment
    const segments = pathname.split('/');
    segments[1] = next;
    startTransition(() => router.replace(segments.join('/')));
  };

  return (
    <div className="flex items-center gap-1" aria-label={t('language')}>
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          disabled={isPending}
          aria-current={locale === code ? 'true' : undefined}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors
            ${locale === code
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
