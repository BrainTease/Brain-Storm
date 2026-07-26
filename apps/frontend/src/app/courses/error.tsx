'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function CoursesError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="courses" {...props} />;
}
