'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function StatsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="stats" {...props} />;
}
