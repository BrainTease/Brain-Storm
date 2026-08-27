'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function CredentialsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="credentials" {...props} />;
}
