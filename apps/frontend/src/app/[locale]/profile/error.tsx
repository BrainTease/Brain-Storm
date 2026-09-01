'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function ProfileError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="profile" {...props} />;
}
