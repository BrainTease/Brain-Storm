'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

const LOCALES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'es', label: 'ES', name: 'Español' },
];

export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (next: string) => {
    const segments = pathname.split('/');
    segments[1] = next;
    startTransition(() => router.replace(segments.join('/')));
  };

  return (
    <div role="group" aria-label={t('language')} className="flex items-center gap-1">
      {LOCALES.map(({ code, label, name }) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLocale(code)}
          disabled={isPending || locale === code}
          aria-pressed={locale === code}
          aria-label={name}
          className={`px-2 py-1 text-xs rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
            ${
              locale === code
                ? 'bg-blue-700 text-white dark:bg-blue-600 cursor-default'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
