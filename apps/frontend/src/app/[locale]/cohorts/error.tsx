'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function CohortsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="cohorts" {...props} />;
}
