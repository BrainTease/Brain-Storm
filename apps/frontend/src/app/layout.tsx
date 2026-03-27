import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/Toaster';

export const metadata: Metadata = {
  title: 'Brain-Storm - Blockchain Education on Stellar',
  description:
    'Learn blockchain development with verifiable on-chain credentials powered by the Stellar network.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
