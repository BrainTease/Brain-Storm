import { defineRouting } from 'next-intl/routing';

export const RTL_LOCALES = ['ar', 'he', 'fa'] as const;

export type RTLLocale = (typeof RTL_LOCALES)[number];

export function isRTLLocale(locale: string): locale is RTLLocale {
  return RTL_LOCALES.includes(locale as RTLLocale);
}

export const routing = defineRouting({
  locales: ['en', 'es', 'fr', 'ar'],
  defaultLocale: 'en',
});
