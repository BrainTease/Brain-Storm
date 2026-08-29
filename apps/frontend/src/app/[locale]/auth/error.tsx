'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function AuthError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="auth" {...props} />;
}
