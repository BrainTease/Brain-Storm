'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function InstructorError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="instructor" {...props} />;
}
