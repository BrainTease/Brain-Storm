'use client';

import { useLocale } from 'next-intl';
import { RTL_LOCALES } from '@/i18n/routing';

/**
 * Hook to check if the current locale is RTL (right-to-left).
 * @returns boolean indicating whether the current locale is RTL
 */
export function useIsRTL(): boolean {
  const locale = useLocale();
  return RTL_LOCALES.includes(locale as any);
}
