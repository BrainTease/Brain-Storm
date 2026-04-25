import type { Metadata } from 'next';
import './globals.css';
import { WalletButton } from '@/components/wallet/WalletButton';
import NetworkStatus from '@/components/ui/NetworkStatus';
import { TourProvider } from '@/components/ui/TourProvider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://brain-storm.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Brain-Storm - Blockchain Education on Stellar',
    template: '%s | Brain-Storm',
  },
  description:
    'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
  alternates: { canonical: '/' },
  openGraph: {
    siteName: 'Brain-Storm',
    type: 'website',
    title: 'Brain-Storm - Blockchain Education on Stellar',
    description:
      'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brain-Storm - Blockchain Education on Stellar',
    description:
      'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <TourProvider>
          <nav className="border-b px-6 py-3 flex items-center justify-between">
            <a href="/" className="font-bold text-lg text-blue-600">Brain-Storm</a>
            <div className="flex items-center gap-4">
              <a href="/courses" className="text-sm text-gray-600 hover:text-gray-900">Courses</a>            <a href="/referrals" className="text-sm text-gray-600 hover:text-gray-900">Referrals</a>              <a href="/profile" className="text-sm text-gray-600 hover:text-gray-900">Profile</a>
              <a href="/admin" className="text-sm text-gray-600 hover:text-gray-900">Admin</a>
              <WalletButton />
            </div>
          </nav>
          {children}
        </TourProvider>
        <NetworkStatus />
      </body>
    </html>
  );
}
