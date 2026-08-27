'use client';

import { RouteError } from '@/components/ui/RouteError';

export default function LocaleError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError boundary="locale" {...props} />;
}
