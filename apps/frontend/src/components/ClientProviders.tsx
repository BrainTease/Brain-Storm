'use client';

import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from '@/components/ui/Toaster';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      {/* Renders the queue that `lib/toast` writes to; without it toasts never appear. */}
      <Toaster />
    </AuthProvider>
  );
}
