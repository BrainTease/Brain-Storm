'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function ReferralsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="referrals" {...props} />;
}
