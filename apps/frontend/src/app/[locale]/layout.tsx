import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, RTL_LOCALES, isRTLLocale } from '@/i18n/routing';
import { ThemeProvider } from '@/components/ThemeProvider';
import { WalletProvider } from '@/lib/wallet';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { GlobalShortcuts } from '@/components/GlobalShortcuts';
import { Toaster } from '@/components/ui/Toaster';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Brain-Storm - Blockchain Education on Stellar',
  description:
    'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();
  const dir = isRTLLocale(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200 flex flex-col min-h-screen">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <WalletProvider>
              <a href="#main-content" className="skip-link">
                Skip to main content
              </a>
              <Navbar />
              <GlobalShortcuts />
              <div id="main-content" tabIndex={-1} className="flex-1">
                {children}
              </div>
              <Footer />
              {/* Renders the queue that `lib/toast` writes to; without it toasts never appear. */}
              <Toaster />
            </WalletProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
