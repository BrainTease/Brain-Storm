'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.push('/auth/login');
    }
  }, [isLoading, token, router]);

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper loading component
  }

  if (!token) {
    return null; // Or redirect component
  }

  return <>{children}</>;
}
